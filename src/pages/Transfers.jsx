import { useEffect, useState } from "react";
import api, { formatTL, formatDateTime } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Plus, ArrowRightLeft } from "lucide-react";
import KasaTransferModal from "@/components/modals/KasaTransferModal";
import MuvekkilTransferModal from "@/components/modals/MuvekkilTransferModal";

export default function Transfers() {
  const [kasalar, setKasalar] = useState([]);
  const [clients, setClients] = useState([]);
  const [txs, setTxs] = useState([]);
  const [openKasa, setOpenKasa] = useState(false);
  const [openMv, setOpenMv] = useState(false);

  const refresh = async () => {
    const [k, c, t] = await Promise.all([
      api.get("/kasalar"), api.get("/clients"),
      api.get("/transactions?limit=200"),
    ]);
    setKasalar(k.data); setClients(c.data);
    setTxs(t.data.filter(x => ["kasa_transfer", "client_to_kasa", "kasa_to_client"].includes(x.type)));
  };
  useEffect(() => { refresh(); }, []);

  const typeLabel = (t) => ({
    kasa_transfer: "Kasa Virmanı",
    client_to_kasa: "Müvekkilden Kasaya",
    kasa_to_client: "Kasadan Müvekkile",
  }[t]);

  return (
    <div className="space-y-6" data-testid="transfers-page">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-1">Para Transferleri</div>
          <h1 className="font-serif-legal text-3xl text-slate-900">Virman & Cari Hareketleri</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenKasa(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-11">
            <ArrowLeftRight className="w-4 h-4 mr-2" /> Kasa Transferi
          </Button>
          <Button onClick={() => setOpenMv(true)} variant="outline" className="h-11">
            <Plus className="w-4 h-4 mr-2" /> Müvekkil Transferi
          </Button>
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-serif-legal text-xl text-slate-900">Transfer Geçmişi</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {txs.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Henüz transfer yok</div>}
          {txs.map(t => (
            <div key={t.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{typeLabel(t.type)}</span>
                    <Badge variant="outline" className="text-[10px] font-mono-num">{t.receipt_no || "—"}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {t.type === "kasa_transfer"
                      ? `${t.source_kasa_name} → ${t.target_kasa_name}`
                      : `${t.client_name} · ${t.kasa_name}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono-num text-sm font-semibold text-slate-900">{formatTL(t.amount)}</div>
                <div className="text-[10px] text-slate-400">{formatDateTime(t.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <KasaTransferModal open={openKasa} onOpenChange={setOpenKasa} kasalar={kasalar} onDone={refresh} />
      <MuvekkilTransferModal open={openMv} onOpenChange={setOpenMv} kasalar={kasalar} clients={clients} onDone={refresh} />
    </div>
  );
}
