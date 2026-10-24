import { useEffect, useState } from "react";
import api, { formatTL, formatDateTime } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TX_TYPES as TYPES } from "@/lib/txTypes";
import { TxRowActions } from "@/components/TxRowActions";
import TxEditModal from "@/components/modals/TxEditModal";

export default function Ledger() {
  const [txs, setTxs] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [clients, setClients] = useState([]);
  const [editTx, setEditTx] = useState(null);
  const [kasaId, setKasaId] = useState("all");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    const p = new URLSearchParams();
    if (kasaId && kasaId !== "all") p.set("kasa_id", kasaId);
    if (type && type !== "all") p.set("tx_type", type);
    const [t, k, c] = await Promise.all([
      api.get(`/transactions?${p}&limit=500`),
      api.get("/kasalar"),
      api.get("/clients"),
    ]);
    setTxs(t.data); setKasalar(k.data); setClients(c.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kasaId, type]);

  const filtered = txs.filter(t => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (t.client_name || "").toLowerCase().includes(s) ||
      (t.description || "").toLowerCase().includes(s) ||
      (t.kasa_name || "").toLowerCase().includes(s) ||
      (t.source_kasa_name || "").toLowerCase().includes(s) ||
      (t.target_kasa_name || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6" data-testid="ledger-page">
      <header>
        <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-1">İşlem Günlüğü</div>
        <h1 className="font-serif-legal text-3xl text-slate-900">Muhasebe Ledger</h1>
      </header>

      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Kasa</Label>
            <Select value={kasaId} onValueChange={setKasaId}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="filter-kasa-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kasalar</SelectItem>
                {kasalar.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>İşlem Türü</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hepsi</SelectItem>
                {Object.entries(TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ara</Label>
            <Input placeholder="Müvekkil, açıklama, kasa…" value={q} onChange={e => setQ(e.target.value)} className="mt-1.5 h-11" data-testid="global-ledger-search-input" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="p-3 font-semibold text-slate-700 text-xs uppercase tracking-widest">Tarih</th>
                <th className="p-3 font-semibold text-slate-700 text-xs uppercase tracking-widest">Tür</th>
                <th className="p-3 font-semibold text-slate-700 text-xs uppercase tracking-widest">Kasa</th>
                <th className="p-3 font-semibold text-slate-700 text-xs uppercase tracking-widest">Müvekkil</th>
                <th className="p-3 font-semibold text-slate-700 text-xs uppercase tracking-widest">Açıklama</th>
                <th className="p-3 font-semibold text-slate-700 text-xs uppercase tracking-widest text-right">Tutar</th>
                <th className="p-3 font-semibold text-slate-700 text-xs uppercase tracking-widest text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500 text-sm">Kayıt yok</td></tr>
              )}
              {filtered.map(t => {
                const isIn = ["client_to_kasa", "receivable_collection"].includes(t.type);
                const isOut = ["expense", "kasa_to_client"].includes(t.type);
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600 whitespace-nowrap">{formatDateTime(t.date)}</td>
                    <td className="p-3"><Badge variant="outline">{TYPES[t.type] || t.type}</Badge></td>
                    <td className="p-3 text-slate-700">
                      {t.type === "kasa_transfer" ? `${t.source_kasa_name} → ${t.target_kasa_name}` : (t.kasa_name || "—")}
                    </td>
                    <td className="p-3 text-slate-700">{t.client_name || "—"}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{t.description || t.expense_type || "—"}</td>
                    <td className={`p-3 text-right font-mono-num font-semibold whitespace-nowrap ${isIn ? "text-emerald-700" : isOut ? "text-rose-700" : "text-slate-900"}`}>
                      {isIn ? "+" : isOut ? "-" : ""}{formatTL(t.amount)}
                    </td>
                    <td className="p-3"><TxRowActions tx={t} onEdit={setEditTx} onChanged={load} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <TxEditModal tx={editTx} onOpenChange={(o) => !o && setEditTx(null)} kasalar={kasalar} clients={clients} onDone={load} />
    </div>
  );
}
