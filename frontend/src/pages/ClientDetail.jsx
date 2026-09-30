import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatTL, formatDateTime } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Receipt, Scale } from "lucide-react";
import MuvekkilTransferModal from "@/components/modals/MuvekkilTransferModal";
import MasrafModal from "@/components/modals/MasrafModal";
import AlacakModal from "@/components/modals/AlacakModal";

export default function ClientDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [kasalar, setKasalar] = useState([]);
  const [clients, setClients] = useState([]);
  const [openTx, setOpenTx] = useState(false);
  const [openExp, setOpenExp] = useState(false);
  const [openRec, setOpenRec] = useState(false);

  const refresh = async () => {
    const [d, k, cs] = await Promise.all([
      api.get(`/clients/${id}`),
      api.get("/kasalar"),
      api.get("/clients"),
    ]);
    setData(d.data); setKasalar(k.data); setClients(cs.data);
  };
  useEffect(() => { refresh(); }, [id]);

  if (!data) return <div className="text-sm text-slate-500">Yükleniyor…</div>;
  const { client, transactions, expenses, receivables } = data;

  return (
    <div className="space-y-6">
      <Link to="/muvekkiller" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Müvekkil Listesine Dön
      </Link>

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-1">Müvekkil Kartı</div>
          <h1 className="font-serif-legal text-3xl text-slate-900">{client.name}</h1>
          <div className="text-sm text-slate-500 mt-1">
            {client.tc_vkn && <span className="mr-3">TC/VKN: {client.tc_vkn}</span>}
            {client.phone && <span className="mr-3">Tel: {client.phone}</span>}
            {client.email && <span>{client.email}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpenTx(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-11">
            <Plus className="w-4 h-4 mr-2" /> Transfer
          </Button>
          <Button onClick={() => setOpenExp(true)} variant="outline" className="h-11">
            <Receipt className="w-4 h-4 mr-2" /> Masraf Ekle
          </Button>
          <Button onClick={() => setOpenRec(true)} variant="outline" className="h-11">
            <Scale className="w-4 h-4 mr-2" /> Alacak Ekle
          </Button>
        </div>
      </header>

      <Card className="p-6">
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Cari Bakiye</div>
        <div className={`font-mono-num text-3xl font-bold ${client.balance < 0 ? "text-rose-700" : "text-emerald-700"}`}>
          {formatTL(client.balance)}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {client.balance < 0 ? "Müvekkil büroya borçlu" : client.balance > 0 ? "Büro müvekkile borçlu (avans / emanet)" : "Denk"}
        </div>
      </Card>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Hareketler ({transactions.length})</TabsTrigger>
          <TabsTrigger value="expenses">Masraflar ({expenses.length})</TabsTrigger>
          <TabsTrigger value="receivables">Alacaklar ({receivables.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="mt-4">
          <Card className="divide-y divide-slate-100">
            {transactions.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Hareket yok</div>}
            {transactions.map(t => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">{t.type}</div>
                  <div className="text-xs text-slate-500">{t.kasa_name} · {t.description || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono-num text-sm font-semibold">{formatTL(t.amount)}</div>
                  <div className="text-[10px] text-slate-400">{formatDateTime(t.date)}</div>
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>
        <TabsContent value="expenses" className="mt-4">
          <Card className="divide-y divide-slate-100">
            {expenses.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Masraf yok</div>}
            {expenses.map(e => (
              <div key={e.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">{e.expense_type}</div>
                  <div className="text-xs text-slate-500">{e.file_no || "—"} · {e.kasa_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono-num text-sm font-semibold text-rose-700">-{formatTL(e.amount)}</div>
                  <div className="text-[10px] text-slate-400">{formatDateTime(e.date)}</div>
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>
        <TabsContent value="receivables" className="mt-4">
          <Card className="divide-y divide-slate-100">
            {receivables.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Alacak yok</div>}
            {receivables.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {r.fee_type === "akdi" ? "Akdi Vekalet" : "Karşı Yan Vekalet"}
                  </div>
                  <div className="text-xs text-slate-500">{r.file_no || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono-num text-sm font-semibold">{formatTL(r.total_amount)}</div>
                  <div className="text-[10px]">
                    <Badge variant="outline" className="mr-1">Kalan: {formatTL(r.remaining)}</Badge>
                    <Badge variant={r.status === "tahsil_edildi" ? "default" : "secondary"}>
                      {r.status === "tahsil_edildi" ? "Tahsil Edildi" : "Açık"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      <MuvekkilTransferModal open={openTx} onOpenChange={setOpenTx} kasalar={kasalar} clients={clients} onDone={refresh} defaultClientId={id} />
      <MasrafModal open={openExp} onOpenChange={setOpenExp} kasalar={kasalar} clients={clients} onDone={refresh} defaultClientId={id} />
      <AlacakModal open={openRec} onOpenChange={setOpenRec} clients={clients} onDone={refresh} defaultClientId={id} />
    </div>
  );
}
