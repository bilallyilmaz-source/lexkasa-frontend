import { useEffect, useState } from "react";
import api, { formatTL, formatDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scale, Coins } from "lucide-react";
import { toast } from "sonner";
import AlacakModal from "@/components/modals/AlacakModal";

export default function Receivables() {
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [open, setOpen] = useState(false);
  const [collectFor, setCollectFor] = useState(null);
  const [collectAmt, setCollectAmt] = useState("");
  const [collectKasa, setCollectKasa] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [r, c, k] = await Promise.all([api.get("/receivables"), api.get("/clients"), api.get("/kasalar")]);
    setItems(r.data); setClients(c.data); setKasalar(k.data);
  };
  useEffect(() => { refresh(); }, []);

  const collect = async () => {
    if (!collectAmt || !collectKasa) return toast.error("Tutar ve kasa zorunlu");
    setBusy(true);
    try {
      await api.post(`/receivables/${collectFor.id}/collect`, {
        amount: parseFloat(collectAmt), kasa_id: collectKasa,
      });
      toast.success("Tahsilat kaydedildi");
      setCollectFor(null); setCollectAmt(""); setCollectKasa("");
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "İşlem başarısız");
    } finally { setBusy(false); }
  };

  const totalOpen = items.reduce((a, b) => a + (b.remaining || 0), 0);

  return (
    <div className="space-y-6" data-testid="receivables-page">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-1">Vekalet Ücreti Alacakları</div>
          <h1 className="font-serif-legal text-3xl text-slate-900">Akdi & Karşı Yan Alacaklar</h1>
          <div className="text-sm text-slate-500 mt-1">Toplam açık alacak: <span className="font-mono-num font-semibold text-amber-800">{formatTL(totalOpen)}</span></div>
        </div>
        <Button data-testid="open-new-receivable-modal-btn" onClick={() => setOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-11">
          <Plus className="w-4 h-4 mr-2" /> Yeni Alacak
        </Button>
      </header>

      <Card className="divide-y divide-slate-100">
        {items.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Kayıtlı alacak yok</div>}
        {items.map(r => (
          <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">{r.client_name}</div>
                <div className="text-xs text-slate-500">
                  <Badge variant="outline" className="mr-2">
                    {r.fee_type === "akdi" ? "Akdi Vekalet" : "Karşı Yan Vekalet"}
                  </Badge>
                  {r.file_no || "—"} · {formatDate(r.date)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-400">Kalan</div>
                <div className="font-mono-num text-sm font-semibold text-amber-800">{formatTL(r.remaining)}</div>
                <div className="text-[10px] text-slate-500">/ {formatTL(r.total_amount)}</div>
              </div>
              <Badge variant={r.status === "tahsil_edildi" ? "default" : "secondary"}>
                {r.status === "tahsil_edildi" ? "Tahsil Edildi" : "Açık"}
              </Badge>
              {r.status !== "tahsil_edildi" && (
                <Button size="sm" variant="outline" onClick={() => setCollectFor(r)}>
                  <Coins className="w-3 h-3 mr-1" /> Tahsil Et
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <AlacakModal open={open} onOpenChange={setOpen} clients={clients} onDone={refresh} />

      <Dialog open={!!collectFor} onOpenChange={(o) => !o && setCollectFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif-legal text-2xl">Tahsilat Yap</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              {collectFor?.client_name} · Kalan: <span className="font-mono-num font-semibold">{formatTL(collectFor?.remaining)}</span>
            </div>
            <div>
              <Label>Tutar (TL)</Label>
              <Input type="number" step="0.01" value={collectAmt} onChange={e => setCollectAmt(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label>Yatan Kasa</Label>
              <Select value={collectKasa} onValueChange={setCollectKasa}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>{kasalar.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectFor(null)}>İptal</Button>
            <Button onClick={collect} disabled={busy} className="bg-slate-900 hover:bg-slate-800">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
