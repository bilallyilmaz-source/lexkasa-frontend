import sys
import requests

API = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"
t = requests.post(f"{API}/api/auth/login", json={"email": "admin@lexkasa.com", "password": "admin123"}).json()["token"]
h = {"Authorization": f"Bearer {t}"}
g = lambda p: requests.get(f"{API}/api{p}", headers=h).json()
ks = g("/kasalar"); k1, k2 = ks[0]["id"], ks[1]["id"]
c = requests.post(f"{API}/api/clients", json={"name": "TEST_TxSmoke"}, headers=h).json()
c2 = requests.post(f"{API}/api/clients", json={"name": "TEST_TxSmoke2"}, headers=h).json()
kb = lambda i: next(k["balance"] for k in g("/kasalar") if k["id"] == i)
cb = lambda i: g(f"/clients/{i}")["client"]["balance"]
b1, b2 = kb(k1), kb(k2)
requests.post(f"{API}/api/transfers/client", json={"direction": "client_to_kasa", "kasa_id": k1, "client_id": c["id"], "amount": 1000}, headers=h)
requests.post(f"{API}/api/expenses", json={"client_id": c["id"], "kasa_id": k1, "expense_type": "Adli Harç", "amount": 300}, headers=h)
txs = g(f"/transactions?client_id={c['id']}")
exp = next(x for x in txs if x["type"] == "expense"); inc = next(x for x in txs if x["type"] == "client_to_kasa")
assert cb(c["id"]) == 700 and round(kb(k1) - b1, 2) == 700
r = requests.patch(f"{API}/api/transactions/{exp['id']}", json={"amount": 500, "kasa_id": k2}, headers=h); assert r.status_code == 200, r.text
assert cb(c["id"]) == 500 and round(kb(k1) - b1, 2) == 1000 and round(kb(k2) - b2, 2) == -500
assert g(f"/clients/{c['id']}")["expenses"][0]["amount"] == 500
r = requests.patch(f"{API}/api/transactions/{inc['id']}", json={"type": "kasa_to_client", "client_id": c2["id"]}, headers=h); assert r.status_code == 200, r.text
assert cb(c["id"]) == -500 and cb(c2["id"]) == -1000 and round(kb(k1) - b1, 2) == -1000
r = requests.patch(f"{API}/api/transactions/{exp['id']}", json={"type": "client_to_kasa"}, headers=h); assert r.status_code == 200
assert g(f"/clients/{c['id']}")["expenses"] == [] and cb(c["id"]) == 500
r = requests.patch(f"{API}/api/transactions/{exp['id']}", json={"amount": -5}, headers=h); assert r.status_code == 400
requests.delete(f"{API}/api/transactions/{exp['id']}", headers=h)
requests.delete(f"{API}/api/transactions/{inc['id']}", headers=h)
assert cb(c["id"]) == 0 and cb(c2["id"]) == 0 and kb(k1) == b1 and kb(k2) == b2
assert requests.delete(f"{API}/api/transactions/nope", headers=h).status_code == 404
print("ALL OK")
