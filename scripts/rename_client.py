import sys
import requests

API = sys.argv[1] if len(sys.argv) > 1 else "https://lex-kasa.onrender.com"
EMAIL, PASSWORD = "admin@lexkasa.com", "admin123"

token = requests.post(f"{API}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=90).json()["token"]
h = {"Authorization": f"Bearer {token}"}
clients = requests.get(f"{API}/api/clients", headers=h, timeout=60).json()
tests = [c for c in clients if "test" in c["name"].lower()]
print("Bulunan test kartları:", [(c["name"], c["balance"]) for c in tests])
if not tests:
    sys.exit("Test kartı yok")
target = next((c for c in tests if c["name"] == "TEST_Muvekkil_38019"), tests[0])
r = requests.patch(f"{API}/api/clients/{target['id']}", json={"name": "BÜRO"}, headers=h, timeout=60)
print(r.status_code, r.text)
