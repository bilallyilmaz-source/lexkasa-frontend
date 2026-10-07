from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import bcrypt
import jwt
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]

app = FastAPI(title="LexKasa API")
api_router = APIRouter(prefix="/api")

# ---------- Utilities ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return str(uuid.uuid4())

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(hours=12),
               "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Oturum süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class KasaTransferIn(BaseModel):
    source_kasa_id: str
    target_kasa_id: str
    amount: float
    description: Optional[str] = ""
    receipt_no: Optional[str] = ""
    date: Optional[str] = None

class ClientTransferIn(BaseModel):
    direction: Literal["client_to_kasa", "kasa_to_client"]
    kasa_id: str
    client_id: str
    amount: float
    category: Optional[str] = "avans"  # avans, masraf, ucret_odemesi, iade
    file_no: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = None

class ClientIn(BaseModel):
    name: str
    tc_vkn: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    notes: Optional[str] = ""

class ExpenseIn(BaseModel):
    client_id: str
    file_no: Optional[str] = ""
    expense_type: str  # Harç, Bilirkişi, Keşif, Tebligat, Baro Pulu, Diğer
    amount: float
    kasa_id: str  # ödenen kasa
    receipt_no: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = None

class ReceivableIn(BaseModel):
    client_id: str
    file_no: Optional[str] = ""
    fee_type: Literal["akdi", "karsi_yan"]
    total_amount: float
    collected_amount: Optional[float] = 0.0
    description: Optional[str] = ""
    date: Optional[str] = None

class ReceivableCollectIn(BaseModel):
    amount: float
    kasa_id: str
    description: Optional[str] = ""

# ---------- Auth ----------
@api_router.post("/auth/register")
async def register(payload: RegisterIn):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    user = {
        "id": new_id(),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre")
    token = create_access_token(user["id"], user["email"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current

# ---------- Kasalar ----------
DEFAULT_KASALAR = [
    {"code": "merkez", "name": "Merkez Ofis Kasası", "description": "Fiziki nakit giriş-çıkışları", "color": "emerald"},
    {"code": "banka", "name": "Banka Ana Cari Kasası", "description": "Ana kurumsal banka hesabı", "color": "blue"},
    {"code": "emanet", "name": "Müvekkil Emanet / Masraf Kasası", "description": "Bilirkişi, keşif, harç, emanet", "color": "amber"},
    {"code": "icra", "name": "İcra & Tahsilat Kasası", "description": "İcra ve mahkemeden tahsil edilenler", "color": "indigo"},
]

async def ensure_default_kasalar():
    count = await db.kasalar.count_documents({})
    if count == 0:
        for k in DEFAULT_KASALAR:
            await db.kasalar.insert_one({
                "id": new_id(),
                "code": k["code"],
                "name": k["name"],
                "description": k["description"],
                "color": k["color"],
                "balance": 0.0,
                "created_at": now_iso(),
            })

async def get_kasa(kasa_id: str):
    return await db.kasalar.find_one({"id": kasa_id}, {"_id": 0})

async def adjust_kasa(kasa_id: str, delta: float):
    await db.kasalar.update_one({"id": kasa_id}, {"$inc": {"balance": delta}})

async def log_tx(tx: dict):
    tx["_id_key"] = new_id()  # never returned; we use "id"
    tx["id"] = tx.get("id") or new_id()
    tx["created_at"] = now_iso()
    tx.pop("_id_key", None)
    await db.transactions.insert_one(tx)

@api_router.get("/kasalar")
async def list_kasalar(current=Depends(get_current_user)):
    items = await db.kasalar.find({}, {"_id": 0}).to_list(100)
    items.sort(key=lambda x: x["created_at"])
    return items

class KasaUpdateIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

@api_router.patch("/kasalar/{kasa_id}")
async def update_kasa(kasa_id: str, payload: KasaUpdateIn, current=Depends(get_current_user)):
    kasa = await get_kasa(kasa_id)
    if not kasa:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")
    update = {}
    if payload.name is not None and payload.name.strip():
        update["name"] = payload.name.strip()
    if payload.description is not None:
        update["description"] = payload.description.strip()
    if not update:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")
    await db.kasalar.update_one({"id": kasa_id}, {"$set": update})
    return await get_kasa(kasa_id)

# ---------- Transfers ----------
@api_router.post("/transfers/kasa")
async def kasa_transfer(payload: KasaTransferIn, current=Depends(get_current_user)):
    if payload.source_kasa_id == payload.target_kasa_id:
        raise HTTPException(status_code=400, detail="Kaynak ve hedef kasa aynı olamaz")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Tutar sıfırdan büyük olmalı")
    src = await get_kasa(payload.source_kasa_id)
    tgt = await get_kasa(payload.target_kasa_id)
    if not src or not tgt:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")
    await adjust_kasa(src["id"], -payload.amount)
    await adjust_kasa(tgt["id"], payload.amount)
    tx_id = new_id()
    await log_tx({
        "id": tx_id, "type": "kasa_transfer", "amount": payload.amount,
        "source_kasa_id": src["id"], "source_kasa_name": src["name"],
        "target_kasa_id": tgt["id"], "target_kasa_name": tgt["name"],
        "description": payload.description or "",
        "receipt_no": payload.receipt_no or "",
        "date": payload.date or now_iso(),
        "user_id": current["id"],
    })
    return {"success": True, "id": tx_id}

@api_router.post("/transfers/client")
async def client_transfer(payload: ClientTransferIn, current=Depends(get_current_user)):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Tutar sıfırdan büyük olmalı")
    kasa = await get_kasa(payload.kasa_id)
    client_doc = await db.clients.find_one({"id": payload.client_id}, {"_id": 0})
    if not kasa or not client_doc:
        raise HTTPException(status_code=404, detail="Kasa veya müvekkil bulunamadı")

    if payload.direction == "client_to_kasa":
        # müvekkilden kasaya para giriyor (avans / ödeme)
        await adjust_kasa(kasa["id"], payload.amount)
        await db.clients.update_one({"id": client_doc["id"]},
                                    {"$inc": {"balance": payload.amount}})
        tx_type = "client_to_kasa"
    else:
        # kasadan müvekkile ödeme (iade / masraf ödemesi)
        await adjust_kasa(kasa["id"], -payload.amount)
        await db.clients.update_one({"id": client_doc["id"]},
                                    {"$inc": {"balance": -payload.amount}})
        tx_type = "kasa_to_client"

    tx_id = new_id()
    await log_tx({
        "id": tx_id, "type": tx_type, "amount": payload.amount,
        "kasa_id": kasa["id"], "kasa_name": kasa["name"],
        "client_id": client_doc["id"], "client_name": client_doc["name"],
        "category": payload.category, "file_no": payload.file_no or "",
        "description": payload.description or "",
        "date": payload.date or now_iso(),
        "user_id": current["id"],
    })
    return {"success": True, "id": tx_id}

# ---------- Clients ----------
@api_router.get("/clients")
async def list_clients(current=Depends(get_current_user)):
    items = await db.clients.find({}, {"_id": 0}).to_list(1000)
    items.sort(key=lambda x: x.get("created_at", ""))
    return items

@api_router.post("/clients")
async def create_client(payload: ClientIn, current=Depends(get_current_user)):
    doc = {
        "id": new_id(),
        "name": payload.name,
        "tc_vkn": payload.tc_vkn or "",
        "phone": payload.phone or "",
        "email": payload.email or "",
        "notes": payload.notes or "",
        "balance": 0.0,
        "created_at": now_iso(),
    }
    await db.clients.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/clients/{client_id}")
async def client_detail(client_id: str, current=Depends(get_current_user)):
    c = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Müvekkil bulunamadı")
    txs = await db.transactions.find(
        {"client_id": client_id}, {"_id": 0}
    ).to_list(500)
    txs.sort(key=lambda x: x.get("date", ""), reverse=True)
    expenses = await db.expenses.find({"client_id": client_id}, {"_id": 0}).to_list(500)
    receivables = await db.receivables.find({"client_id": client_id}, {"_id": 0}).to_list(500)
    return {"client": c, "transactions": txs, "expenses": expenses, "receivables": receivables}

# ---------- Expenses ----------
@api_router.get("/expenses")
async def list_expenses(current=Depends(get_current_user)):
    items = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    items.sort(key=lambda x: x.get("date", ""), reverse=True)
    return items

@api_router.post("/expenses")
async def create_expense(payload: ExpenseIn, current=Depends(get_current_user)):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Tutar sıfırdan büyük olmalı")
    client_doc = await db.clients.find_one({"id": payload.client_id}, {"_id": 0})
    kasa = await get_kasa(payload.kasa_id)
    if not client_doc or not kasa:
        raise HTTPException(status_code=404, detail="Müvekkil veya kasa bulunamadı")
    # Masraf ödendi -> kasadan düş, müvekkil borcu (kasaya olan borcu) artar
    await adjust_kasa(kasa["id"], -payload.amount)
    # Müvekkilin ofise borcu arttı => balance negatif yönde
    await db.clients.update_one({"id": client_doc["id"]}, {"$inc": {"balance": -payload.amount}})
    doc = {
        "id": new_id(),
        "client_id": client_doc["id"],
        "client_name": client_doc["name"],
        "file_no": payload.file_no or "",
        "expense_type": payload.expense_type,
        "amount": payload.amount,
        "kasa_id": kasa["id"],
        "kasa_name": kasa["name"],
        "receipt_no": payload.receipt_no or "",
        "description": payload.description or "",
        "date": payload.date or now_iso(),
        "created_at": now_iso(),
        "user_id": current["id"],
    }
    await db.expenses.insert_one(doc)
    await log_tx({
        "id": new_id(), "type": "expense", "amount": payload.amount,
        "kasa_id": kasa["id"], "kasa_name": kasa["name"],
        "client_id": client_doc["id"], "client_name": client_doc["name"],
        "expense_type": payload.expense_type, "file_no": payload.file_no or "",
        "description": payload.description or "",
        "date": doc["date"], "user_id": current["id"],
    })
    doc.pop("_id", None)
    return doc

# ---------- Receivables ----------
@api_router.get("/receivables")
async def list_receivables(current=Depends(get_current_user)):
    items = await db.receivables.find({}, {"_id": 0}).to_list(1000)
    items.sort(key=lambda x: x.get("date", ""), reverse=True)
    return items

@api_router.post("/receivables")
async def create_receivable(payload: ReceivableIn, current=Depends(get_current_user)):
    if payload.total_amount <= 0:
        raise HTTPException(status_code=400, detail="Toplam ücret sıfırdan büyük olmalı")
    client_doc = await db.clients.find_one({"id": payload.client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Müvekkil bulunamadı")
    doc = {
        "id": new_id(),
        "client_id": client_doc["id"],
        "client_name": client_doc["name"],
        "file_no": payload.file_no or "",
        "fee_type": payload.fee_type,
        "total_amount": payload.total_amount,
        "collected_amount": payload.collected_amount or 0.0,
        "remaining": payload.total_amount - (payload.collected_amount or 0.0),
        "status": "acik" if (payload.collected_amount or 0.0) < payload.total_amount else "tahsil_edildi",
        "description": payload.description or "",
        "date": payload.date or now_iso(),
        "created_at": now_iso(),
        "user_id": current["id"],
    }
    await db.receivables.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/receivables/{rec_id}/collect")
async def collect_receivable(rec_id: str, payload: ReceivableCollectIn, current=Depends(get_current_user)):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Tutar sıfırdan büyük olmalı")
    rec = await db.receivables.find_one({"id": rec_id}, {"_id": 0})
    kasa = await get_kasa(payload.kasa_id)
    if not rec or not kasa:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    new_collected = rec["collected_amount"] + payload.amount
    if new_collected > rec["total_amount"]:
        raise HTTPException(status_code=400, detail="Tahsil edilen tutar toplamı aşamaz")
    remaining = rec["total_amount"] - new_collected
    status = "tahsil_edildi" if remaining == 0 else "acik"
    await db.receivables.update_one({"id": rec_id}, {"$set": {
        "collected_amount": new_collected, "remaining": remaining, "status": status
    }})
    await adjust_kasa(kasa["id"], payload.amount)
    await log_tx({
        "id": new_id(), "type": "receivable_collection", "amount": payload.amount,
        "kasa_id": kasa["id"], "kasa_name": kasa["name"],
        "client_id": rec["client_id"], "client_name": rec["client_name"],
        "receivable_id": rec_id, "fee_type": rec["fee_type"],
        "description": payload.description or "",
        "date": now_iso(), "user_id": current["id"],
    })
    return {"success": True, "remaining": remaining, "status": status}

# ---------- Ledger / Transactions ----------
@api_router.get("/transactions")
async def list_transactions(
    kasa_id: Optional[str] = None,
    client_id: Optional[str] = None,
    tx_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 500,
    current=Depends(get_current_user),
):
    q = {}
    if kasa_id:
        q["$or"] = [{"kasa_id": kasa_id}, {"source_kasa_id": kasa_id}, {"target_kasa_id": kasa_id}]
    if client_id:
        q["client_id"] = client_id
    if tx_type:
        q["type"] = tx_type
    if start_date or end_date:
        drange = {}
        if start_date:
            drange["$gte"] = start_date
        if end_date:
            drange["$lte"] = end_date
        q["date"] = drange
    items = await db.transactions.find(q, {"_id": 0}).to_list(limit)
    items.sort(key=lambda x: x.get("date", ""), reverse=True)
    return items

# ---------- Reports ----------
@api_router.get("/reports/summary")
async def summary(start_date: Optional[str] = None, end_date: Optional[str] = None,
                  current=Depends(get_current_user)):
    q = {}
    if start_date or end_date:
        drange = {}
        if start_date:
            drange["$gte"] = start_date
        if end_date:
            drange["$lte"] = end_date
        q["date"] = drange

    kasalar = await db.kasalar.find({}, {"_id": 0}).to_list(100)
    total_balance = sum(k["balance"] for k in kasalar)

    # Gelirler: client_to_kasa + receivable_collection
    # Giderler: expense + kasa_to_client
    income = 0.0
    expense = 0.0
    txs = await db.transactions.find(q, {"_id": 0}).to_list(5000)
    for t in txs:
        if t["type"] in ("client_to_kasa", "receivable_collection"):
            income += t.get("amount", 0)
        elif t["type"] in ("expense", "kasa_to_client"):
            expense += t.get("amount", 0)

    # Alacaklar
    receivables = await db.receivables.find({}, {"_id": 0}).to_list(5000)
    total_receivable = sum(r["remaining"] for r in receivables)

    # Müvekkil sayısı
    client_count = await db.clients.count_documents({})

    # Trend: son 12 ay veya günlere göre grupla
    daily = {}
    for t in txs:
        d = (t.get("date") or "")[:10]
        if not d:
            continue
        entry = daily.setdefault(d, {"date": d, "income": 0.0, "expense": 0.0})
        if t["type"] in ("client_to_kasa", "receivable_collection"):
            entry["income"] += t.get("amount", 0)
        elif t["type"] in ("expense", "kasa_to_client"):
            entry["expense"] += t.get("amount", 0)
    trend = sorted(daily.values(), key=lambda x: x["date"])

    return {
        "total_balance": total_balance,
        "income": income,
        "expense": expense,
        "net": income - expense,
        "total_receivable": total_receivable,
        "client_count": client_count,
        "kasa_balances": [{"name": k["name"], "balance": k["balance"], "color": k["color"]} for k in kasalar],
        "trend": trend,
    }

# ---------- Startup ----------
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.clients.create_index("id", unique=True)
    await db.kasalar.create_index("id", unique=True)
    await db.transactions.create_index("id", unique=True)
    await ensure_default_kasalar()
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@lexkasa.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(), "email": admin_email, "name": "Yönetici",
            "password_hash": hash_password(admin_pw), "role": "admin",
            "created_at": now_iso(),
        })
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_pw)}})

@api_router.get("/")
async def root():
    return {"service": "LexKasa API", "status": "ok"}

@api_router.post("/admin/reset-data")
async def reset_data(current=Depends(get_current_user)):
    """Tüm işlem verilerini siler, kasa bakiyelerini sıfırlar. Kullanıcı ve kasa isimleri korunur."""
    await db.clients.delete_many({})
    await db.transactions.delete_many({})
    await db.expenses.delete_many({})
    await db.receivables.delete_many({})
    await db.kasalar.update_many({}, {"$set": {"balance": 0.0}})
    return {"success": True, "message": "Tüm test verileri silindi, kasa bakiyeleri sıfırlandı"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
