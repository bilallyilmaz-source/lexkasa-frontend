import { useEffect, useState } from "react";
import api, { formatTL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Download, TrendingUp, TrendingDown, Wallet, Scale } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend, Cell,
} from "recharts";
import { toast } from "sonner";

const COLORS = ["#059669", "#2563EB", "#D97706", "#4F46E5"];

export default function Reports() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState(null);
  const [txs, setTxs] = useState([]);

  const load = async () => {
    const q = new URLSearchParams();
    if (start) q.set("start_date", start);
    if (end) q.set("end_date", end);
    const [s, t] = await Promise.all([
      api.get(`/reports/summary?${q}`),
      api.get(`/transactions?${q}&limit=1000`),
    ]);
    setData(s.data); setTxs(t.data);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const exportCSV = () => {
    if (!txs.length) return toast.error("Aktarılacak veri yok");
    const rows = [["Tarih", "Tür", "Kasa", "Müvekkil", "Tutar (TL)", "Açıklama"]];
    txs.forEach(t => rows.push([
      t.date || "", t.type,
      t.kasa_name || (t.source_kasa_name ? `${t.source_kasa_name}→${t.target_kasa_name}` : ""),
      t.client_name || "", t.amount, (t.description || "").replace(/"/g, "'")
    ]));
    const csv = rows.map(r => r.map(x => `"${x}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lexkasa-hareketler-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-1">Raporlama & Analiz</div>
          <h1 className="font-serif-legal text-3xl text-slate-900">Finansal Analiz</h1>
        </div>
        <Button data-testid="export-excel-report-btn" onClick={exportCSV} className="bg-slate-900 hover:bg-slate-800 text-white h-11">
          <Download className="w-4 h-4 mr-2" /> CSV / Excel İndir
        </Button>
      </header>

      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Başlangıç</Label>
            <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="mt-1.5 h-11" data-testid="filter-date-start" />
          </div>
          <div>
            <Label>Bitiş</Label>
            <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="mt-1.5 h-11" data-testid="filter-date-end" />
          </div>
          <div className="flex items-end">
            <Button onClick={load} className="w-full h-11 bg-slate-900 hover:bg-slate-800">Filtrele</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard label="Toplam Bakiye" value={formatTL(data?.total_balance)} icon={Wallet} c="text-slate-900" />
        <MiniCard label="Gelir" value={formatTL(data?.income)} icon={TrendingUp} c="text-emerald-700" />
        <MiniCard label="Gider" value={formatTL(data?.expense)} icon={TrendingDown} c="text-rose-700" />
        <MiniCard label="Açık Alacak" value={formatTL(data?.total_receivable)} icon={Scale} c="text-amber-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-serif-legal text-lg mb-4 text-slate-900">Gelir / Gider Trendi</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v) => formatTL(v)} />
              <Legend />
              <Line type="monotone" dataKey="income" name="Gelir" stroke="#059669" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" name="Gider" stroke="#e11d48" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-serif-legal text-lg mb-4 text-slate-900">Kasa Bakiye Dağılımı</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.kasa_balances || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={70} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v) => formatTL(v)} />
              <Bar dataKey="balance" name="Bakiye" radius={[6, 6, 0, 0]}>
                {(data?.kasa_balances || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function MiniCard({ label, value, icon: Icon, c }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
        <Icon className={`w-4 h-4 ${c}`} />
      </div>
      <div className={`font-mono-num text-xl font-bold ${c}`}>{value}</div>
    </Card>
  );
}
