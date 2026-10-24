# Transaction edit/delete with balance recomputation - LexKasa
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@lexkasa.com", "password": "admin123"})
    if r.status_code != 200:
        pytest.skip("login failed")
    sess = requests.Session()
    sess.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return sess


@pytest.fixture(scope="module")
def ctx(s):
    ks = s.get(f"{API}/kasalar").json()
    tag = uuid.uuid4().hex[:6]
    c1 = s.post(f"{API}/clients", json={"name": f"TEST_TxA_{tag}"}).json()
    c2 = s.post(f"{API}/clients", json={"name": f"TEST_TxB_{tag}"}).json()
    yield {"k1": ks[0]["id"], "k2": ks[1]["id"], "k3": ks[2]["id"], "c1": c1["id"], "c2": c2["id"]}
    # cleanup via local mongo (no client delete endpoint)
    try:
        m = MongoClient("mongodb://localhost:27017")["lexkasa_db"]
        ids = [c1["id"], c2["id"]]
        m.transactions.delete_many({"client_id": {"$in": ids}})
        m.transactions.delete_many({"description": {"$regex": "^TEST_"}})
        m.expenses.delete_many({"client_id": {"$in": ids}})
        m.receivables.delete_many({"client_id": {"$in": ids}})
        m.clients.delete_many({"id": {"$in": ids}})
        s.post(f"{API}/admin/recalculate-balances")
    except Exception as e:
        print("cleanup error", e)


def kb(s, i):
    return next(k["balance"] for k in s.get(f"{API}/kasalar").json() if k["id"] == i)


def cb(s, i):
    return s.get(f"{API}/clients/{i}").json()["client"]["balance"]


def tx_of(s, cid, typ):
    return next(x for x in s.get(f"{API}/transactions", params={"client_id": cid}).json() if x["type"] == typ)


class TestTxEdit:
    def test_recalculate_endpoint(self, s):
        r = s.post(f"{API}/admin/recalculate-balances")
        assert r.status_code == 200 and r.json()["success"] is True

    def test_recalc_is_consistent_with_incremental(self, s, ctx):
        before = {k["id"]: k["balance"] for k in s.get(f"{API}/kasalar").json()}
        s.post(f"{API}/admin/recalculate-balances")
        after = {k["id"]: k["balance"] for k in s.get(f"{API}/kasalar").json()}
        assert before == after

    def test_client_transfer_edit_amount_and_kasa(self, s, ctx):
        b1, b2 = kb(s, ctx["k1"]), kb(s, ctx["k2"])
        r = s.post(f"{API}/transfers/client", json={"direction": "client_to_kasa", "kasa_id": ctx["k1"],
                                                  "client_id": ctx["c1"], "amount": 1000, "description": "TEST_in"})
        assert r.status_code == 200
        tid = r.json()["id"]
        assert cb(s, ctx["c1"]) == 1000
        r = s.patch(f"{API}/transactions/{tid}", json={"amount": 750.5, "kasa_id": ctx["k2"],
                                                    "description": "TEST_in_edited", "date": "2025-12-01T10:00:00.000Z"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 750.5 and d["kasa_id"] == ctx["k2"] and "_id" not in d
        assert d["kasa_name"]
        assert cb(s, ctx["c1"]) == 750.5
        assert round(kb(s, ctx["k1"]) - b1, 2) == 0
        assert round(kb(s, ctx["k2"]) - b2, 2) == 750.5
        t = tx_of(s, ctx["c1"], "client_to_kasa")
        assert t["description"] == "TEST_in_edited" and t["date"].startswith("2025-12-01")

    def test_change_client(self, s, ctx):
        t = tx_of(s, ctx["c1"], "client_to_kasa")
        r = s.patch(f"{API}/transactions/{t['id']}", json={"client_id": ctx["c2"]})
        assert r.status_code == 200
        assert r.json()["client_name"].startswith("TEST_TxB_")
        assert cb(s, ctx["c1"]) == 0 and cb(s, ctx["c2"]) == 750.5
        s.patch(f"{API}/transactions/{t['id']}", json={"client_id": ctx["c1"]})
        assert cb(s, ctx["c1"]) == 750.5 and cb(s, ctx["c2"]) == 0

    def test_type_change_to_kasa_to_client(self, s, ctx):
        t = tx_of(s, ctx["c1"], "client_to_kasa")
        b2 = kb(s, ctx["k2"])
        r = s.patch(f"{API}/transactions/{t['id']}", json={"type": "kasa_to_client"})
        assert r.status_code == 200
        assert cb(s, ctx["c1"]) == -750.5
        assert round(kb(s, ctx["k2"]) - b2, 2) == -1501.0

    def test_type_change_to_expense_creates_expense_doc(self, s, ctx):
        t = tx_of(s, ctx["c1"], "kasa_to_client")
        r = s.patch(f"{API}/transactions/{t['id']}", json={"type": "expense", "expense_type": "Baro Pulu"})
        assert r.status_code == 200
        assert r.json().get("expense_id")
        exps = s.get(f"{API}/clients/{ctx['c1']}").json()["expenses"]
        assert len(exps) == 1 and exps[0]["amount"] == 750.5 and exps[0]["expense_type"] == "Baro Pulu"
        assert cb(s, ctx["c1"]) == -750.5

    def test_edit_expense_syncs_doc(self, s, ctx):
        t = tx_of(s, ctx["c1"], "expense")
        r = s.patch(f"{API}/transactions/{t['id']}", json={"amount": 200, "kasa_id": ctx["k3"]})
        assert r.status_code == 200
        exps = s.get(f"{API}/clients/{ctx['c1']}").json()["expenses"]
        assert len(exps) == 1 and exps[0]["amount"] == 200 and exps[0]["kasa_id"] == ctx["k3"]
        assert cb(s, ctx["c1"]) == -200

    def test_type_change_away_from_expense_deletes_doc(self, s, ctx):
        t = tx_of(s, ctx["c1"], "expense")
        r = s.patch(f"{API}/transactions/{t['id']}", json={"type": "client_to_kasa"})
        assert r.status_code == 200
        assert s.get(f"{API}/clients/{ctx['c1']}").json()["expenses"] == []
        assert cb(s, ctx["c1"]) == 200

    def test_validation_errors(self, s, ctx):
        t = tx_of(s, ctx["c1"], "client_to_kasa")
        assert s.patch(f"{API}/transactions/{t['id']}", json={"amount": 0}).status_code == 400
        assert s.patch(f"{API}/transactions/{t['id']}", json={"amount": -5}).status_code == 400
        assert s.patch(f"{API}/transactions/{t['id']}", json={"type": "kasa_transfer"}).status_code == 400
        assert s.patch(f"{API}/transactions/{t['id']}", json={"kasa_id": "nope"}).status_code == 404
        assert s.patch(f"{API}/transactions/{t['id']}", json={"client_id": "nope"}).status_code == 404
        assert s.patch(f"{API}/transactions/nope", json={"amount": 5}).status_code == 404
        assert s.patch(f"{API}/transactions/{t['id']}", json={"type": "bogus"}).status_code == 422
        assert cb(s, ctx["c1"]) == 200

    def test_delete_client_tx(self, s, ctx):
        t = tx_of(s, ctx["c1"], "client_to_kasa")
        b3 = kb(s, ctx["k3"])
        r = s.delete(f"{API}/transactions/{t['id']}")
        assert r.status_code == 200
        assert cb(s, ctx["c1"]) == 0
        assert round(kb(s, ctx["k3"]) - b3, 2) == -200
        assert s.delete(f"{API}/transactions/{t['id']}").status_code == 404

    def test_delete_expense_removes_doc(self, s, ctx):
        b1 = kb(s, ctx["k1"])
        r = s.post(f"{API}/expenses", json={"client_id": ctx["c1"], "kasa_id": ctx["k1"], "expense_type": "Adli Harç", "amount": 300})
        assert r.status_code == 200
        assert cb(s, ctx["c1"]) == -300
        t = tx_of(s, ctx["c1"], "expense")
        assert s.delete(f"{API}/transactions/{t['id']}").status_code == 200
        assert s.get(f"{API}/clients/{ctx['c1']}").json()["expenses"] == []
        assert cb(s, ctx["c1"]) == 0 and round(kb(s, ctx["k1"]) - b1, 2) == 0

    def test_kasa_transfer_edit_and_delete(self, s, ctx):
        b1, b2, b3 = kb(s, ctx["k1"]), kb(s, ctx["k2"]), kb(s, ctx["k3"])
        r = s.post(f"{API}/transfers/kasa", json={"source_kasa_id": ctx["k1"], "target_kasa_id": ctx["k2"], "amount": 100, "description": "TEST_vir"})
        tid = r.json()["id"]
        assert s.patch(f"{API}/transactions/{tid}", json={"type": "expense"}).status_code == 400
        assert s.patch(f"{API}/transactions/{tid}", json={"target_kasa_id": ctx["k1"]}).status_code == 400
        r = s.patch(f"{API}/transactions/{tid}", json={"amount": 250, "target_kasa_id": ctx["k3"]})
        assert r.status_code == 200
        assert round(kb(s, ctx["k1"]) - b1, 2) == -250
        assert round(kb(s, ctx["k2"]) - b2, 2) == 0
        assert round(kb(s, ctx["k3"]) - b3, 2) == 250
        assert s.delete(f"{API}/transactions/{tid}").status_code == 200
        assert kb(s, ctx["k1"]) == b1 and kb(s, ctx["k3"]) == b3

    def test_receivable_collection_edit_delete(self, s, ctx):
        b1 = kb(s, ctx["k1"])
        rec = s.post(f"{API}/receivables", json={"client_id": ctx["c1"], "fee_type": "akdi", "total_amount": 1000}).json()
        r = s.post(f"{API}/receivables/{rec['id']}/collect", json={"amount": 400, "kasa_id": ctx["k1"]})
        assert r.status_code == 200
        t = tx_of(s, ctx["c1"], "receivable_collection")
        assert s.patch(f"{API}/transactions/{t['id']}", json={"type": "client_to_kasa"}).status_code == 400
        assert s.patch(f"{API}/transactions/{t['id']}", json={"amount": 1500}).status_code == 400
        r = s.patch(f"{API}/transactions/{t['id']}", json={"amount": 600})
        assert r.status_code == 200
        recs = s.get(f"{API}/clients/{ctx['c1']}").json()["receivables"]
        assert recs[0]["collected_amount"] == 600 and recs[0]["remaining"] == 400
        assert round(kb(s, ctx["k1"]) - b1, 2) == 600
        assert cb(s, ctx["c1"]) == 0  # receivable collection doesn't touch client balance
        assert s.delete(f"{API}/transactions/{t['id']}").status_code == 200
        recs = s.get(f"{API}/clients/{ctx['c1']}").json()["receivables"]
        assert recs[0]["collected_amount"] == 0 and recs[0]["remaining"] == 1000 and recs[0]["status"] == "acik"
        assert kb(s, ctx["k1"]) == b1

    def test_unauthenticated(self):
        assert requests.delete(f"{API}/transactions/x").status_code == 401
        assert requests.patch(f"{API}/transactions/x", json={}).status_code == 401
