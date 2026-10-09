import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function MuvekkilTransferModal({ open, onOpenChange, kasalar, clients, onDone, defaultClientId }) {
  const [direction, setDirection] = useState("client_to_kasa");
  const [kasaId, setKasaId] = useState("");
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [category, setCategory] = useState("avans");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setDirection("client_to_kasa"); setKasaId(""); setClientId(defaultClientId || ""); setAmount(""); setFileNo(""); setDesc(""); setCategory("avans"); }
    else if (defaultClientId) setClientId(defaultClientId);
  }, [open, defaultClientId]);

  const submit = async () => {
    if (!kasaId || !clientId || !amount) return toast.error("Lütfen tüm zorunlu alanları doldurun");
    setBusy(true);
    try {
      await api.post("/transfers/client", {
        direction, kasa_id: kasaId, client_id: clientId,
        amount: parseFloat(amount), file_no: fileNo, category, description: desc,
      });
      toast.success("Transfer tamamlandı");
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "İşlem başarısız");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="muvekkil-transfer-modal">
        <DialogHeader>
          <DialogTitle className="font-serif-legal text-2xl">Müvekkil Hesap Transferi</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Yön</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="direction-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client_to_kasa">Müvekkilden Kasaya (Tahsilat / Avans)</SelectItem>
                <SelectItem value="kasa_to_client">Kasadan Müvekkile (Ödeme / İade)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Müvekkil</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kasa</Label>
              <Select value={kasaId} onValueChange={setKasaId}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {kasalar.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tutar (TL)</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label>Dava / Dosya No</Label>
              <Input value={fileNo} onChange={e => setFileNo(e.target.value)} className="mt-1.5 h-11" />
            </div>
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avans">Masraf Avansı</SelectItem>
                <SelectItem value="ucret_odemesi">Vekalet Ücreti Ödemesi</SelectItem>
                <SelectItem value="iade">İade</SelectItem>
                <SelectItem value="diger">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Açıklama</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={busy} className="bg-slate-900 hover:bg-slate-800">Transferi Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
