import { useEffect, useState } from "react";
import api, { formatTL, formatDateTime } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt } from "lucide-react";
import MasrafModal from "@/components/modals/MasrafModal";

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    const [e, k, c] = await Promise.all([api.get("/expenses"), api.get("/kasalar"), api.get("/clients")]);
    setItems(e.data); setKasalar(k.data); setClients(c.data);
  };
  useEffect(() => { refresh(); }, []);

  const total = items.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-6" data-testid="expenses-page">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-1">Dava & Dosya Masrafları</div>
          <h1 className="font-serif-legal text-3xl text-slate-900">Masraf Kayıtları</h1>
          <div className="text-sm text-slate-500 mt-1">Toplam masraf: <span className="font-mono-num font-semibold">{formatTL(total)}</span></div>
        </div>
        <Button data-testid="open-new-expense-modal-btn" onClick={() => setOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-11">
          <Plus className="w-4 h-4 mr-2" /> Yeni Masraf
        </Button>
      </header>

      <Card className="divide-y divide-slate-100">
        {items.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Masraf kaydı yok</div>}
        {items.map(e => (
          <div key={e.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">{e.client_name}</div>
                <div className="text-xs text-slate-500">
                  <Badge variant="outline" className="mr-2">{e.expense_type}</Badge>
                  {e.file_no || "—"} · {e.kasa_name}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono-num text-sm font-semibold text-rose-700">-{formatTL(e.amount)}</div>
              <div className="text-[10px] text-slate-400">{formatDateTime(e.date)}</div>
            </div>
          </div>
        ))}
      </Card>

      <MasrafModal open={open} onOpenChange={setOpen} kasalar={kasalar} clients={clients} onDone={refresh} />
    </div>
  );
}
