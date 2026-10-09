import { useEffect, useState } from "react";
import api, { formatTL, formatDateTime } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Wallet, TrendingUp, TrendingDown, Scale, Plus, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import KasaTransferModal from "@/components/modals/KasaTransferModal";
import MuvekkilTransferModal from "@/components/modals/MuvekkilTransferModal";
import KasaEditModal from "@/components/modals/KasaEditModal";

const colorMap = {
  emerald: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", ring: "text-emerald-600" },
  blue: { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", ring: "text-blue-600" },
  amber: { text: "text-amber-800", bg: "bg-amber-50", border: "border-amber-200", ring: "text-amber-600" },
  indigo: { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", ring: "text-indigo-600" },
};

export default function Dashboard() {
  const [kasalar, setKasalar] = useState([]);
  const [summary, setSummary] = useState(null);
  const [txs, setTxs] = useState([]);
  const [openKasa, setOpenKasa] = useState(false);
  const [openMv, setOpenMv] = useState(false);
  const [editKasa, setEditKasa] = useState(null);
  const [clients, setClients] = useState([]);

  const refresh = async () => {
    const [k, s, t, c] = await Promise.all([
      api.get("/kasalar"),
      api.get("/reports/summary"),
      api.get("/transactions?limit=8"),
      api.get("/clients"),
    ]);
    setKasalar(k.data);
    setSummary(s.data);
    setTxs(t.data.slice(0, 8));
    setClients(c.data);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-1">Genel Bakış</div>
          <h1 className="font-serif-legal text-3xl sm:text-4xl text-slate-900">Kasa & Cari Panosu</h1>
          <p className="text-sm text-slate-500 mt-1">Büro finansal durumunun anlık görünümü</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="open-vault-transfer-modal-btn"
            onClick={() => setOpenKasa(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white h-11"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" /> Kasa Transferi
          </Button>
          <Button
            data-testid="open-client-transfer-modal-btn"
            variant="outline"
            onClick={() => setOpenMv(true)}
            className="border-slate-300 h-11"
          >
            <Plus className="w-4 h-4 mr-2" /> Müvekkil Transferi
          </Button>
        </div>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Toplam Kasa Bakiyesi" value={formatTL(summary?.total_balance)} icon={Wallet} accent="text-slate-900" testid="kpi-total-balance" />
        <StatCard label="Toplam Gelir" value={formatTL(summary?.income)} icon={TrendingUp} accent="text-emerald-700" testid="kpi-income" />
        <StatCard label="Toplam Gider" value={formatTL(summary?.expense)} icon={TrendingDown} accent="text-rose-700" testid="kpi-expense" />
        <StatCard label="Açık Alacaklar" value={formatTL(summary?.total_receivable)} icon={Scale} accent="text-amber-800" testid="kpi-receivable" />
      </div>

      {/* Kasalar */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif-legal text-2xl text-slate-900">4 Kasa</h2>
          <div className="text-xs font-mono-num uppercase tracking-widest text-slate-400">Kasa Sayısı · {kasalar.length}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kasalar.map((k) => {
            const c = colorMap[k.color] || colorMap.blue;
            return (
              <Card
                key={k.id}
                data-testid={`kasa-card-${k.code}`}
                className={`vault-card p-6 ${c.ring}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-semibold ${c.bg} ${c.text} ${c.border} border`}>
                    {k.code}
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); setEditKasa(k); }}
                    data-testid={`edit-kasa-${k.code}`}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    title="Kasayı düzenle"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="font-serif-legal text-lg text-slate-900 leading-tight mb-1">{k.name}</div>
                <div className="text-xs text-slate-500 mb-4 line-clamp-2">{k.description}</div>
                <div className="font-mono-num text-2xl font-bold text-slate-900 tabular-nums">
                  {formatTL(k.balance)}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent transactions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif-legal text-2xl text-slate-900">Son Hareketler</h2>
          <Link to="/hareketler" className="text-sm text-amber-800 hover:text-amber-900 font-medium">Tümünü Gör →</Link>
        </div>
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {txs.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">Henüz işlem yok</div>
          )}
          {txs.map((t) => (
            <TxRow key={t.id} tx={t} />
          ))}
        </Card>
      </section>

      <KasaTransferModal open={openKasa} onOpenChange={setOpenKasa} kasalar={kasalar} onDone={refresh} />
      <MuvekkilTransferModal open={openMv} onOpenChange={setOpenMv} kasalar={kasalar} clients={clients} onDone={refresh} />
      <KasaEditModal open={!!editKasa} onOpenChange={(o) => !o && setEditKasa(null)} kasa={editKasa} onDone={refresh} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent, testid }) {
  return (
    <Card className="p-5 border-slate-200" data-testid={testid}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
        <Icon className={`w-4 h-4 ${accent}`} />
      </div>
      <div className={`font-mono-num text-xl sm:text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
    </Card>
  );
}

function TxRow({ tx }) {
  const isIncome = ["client_to_kasa", "receivable_collection"].includes(tx.type);
  const isExpense = ["expense", "kasa_to_client"].includes(tx.type);
  const label = {
    kasa_transfer: "Kasa Virmanı",
    client_to_kasa: "Müvekkilden Tahsilat",
    kasa_to_client: "Müvekkile Ödeme",
    expense: "Dava Masrafı",
    receivable_collection: "Vekalet Tahsilatı",
  }[tx.type] || tx.type;

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? "bg-emerald-50 text-emerald-700" : isExpense ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
          {isIncome ? <ArrowDownRight className="w-4 h-4" /> : isExpense ? <ArrowUpRight className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{label}</div>
          <div className="text-xs text-slate-500 truncate">
            {tx.type === "kasa_transfer" ? `${tx.source_kasa_name} → ${tx.target_kasa_name}` :
             tx.client_name ? `${tx.client_name} · ${tx.kasa_name || ""}` : tx.description}
          </div>
        </div>
      </div>
      <div className="text-right ml-3">
        <div className={`font-mono-num text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-700" : isExpense ? "text-rose-700" : "text-slate-800"}`}>
          {isIncome ? "+" : isExpense ? "-" : ""}{formatTL(tx.amount)}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(tx.date)}</div>
      </div>
    </div>
  );
}
