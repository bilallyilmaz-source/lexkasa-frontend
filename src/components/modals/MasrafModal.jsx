import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const EXPENSE_TYPES = ["Adli Harç", "Bilirkişi Ücreti", "Keşif Masrafı", "Tebligat / Posta", "Baro Pulu", "Vekaletname", "Diğer"];

export default function MasrafModal({ open, onOpenChange, kasalar, clients, onDone, defaultClientId }) {
  const [clientId, setClientId] = useState("");
  const [kasaId, setKasaId] = useState("");
  const [type, setType] = useState(EXPENSE_TYPES[0]);
  const [amount, setAmount] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [receipt, setReceipt] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setClientId(defaultClientId || ""); setKasaId(""); setType(EXPENSE_TYPES[0]); setAmount(""); setFileNo(""); setReceipt(""); setDesc(""); }
    else if (defaultClientId) setClientId(defaultClientId);
  }, [open, defaultClientId]);

  const submit = async () => {
    if (!clientId || !kasaId || !amount || !type) return toast.error("Lütfen tüm zorunlu alanları doldurun");
    setBusy(true);
    try {
      await api.post("/expenses", {
        client_id: clientId, kasa_id: kasaId, expense_type: type,
        amount: parseFloat(amount), file_no: fileNo, receipt_no: receipt, description: desc,
      });
      toast.success("Masraf kaydedildi");
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "İşlem başarısız");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif-legal text-2xl">Dava / Dosya Masrafı</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Müvekkil</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ödenen Kasa</Label>
              <Select value={kasaId} onValueChange={setKasaId}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>{kasalar.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Masraf Türü</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tutar (TL)</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5 h-11" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dosya / Esas No</Label>
              <Input value={fileNo} onChange={e => setFileNo(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label>Fiş / Makbuz No</Label>
              <Input value={receipt} onChange={e => setReceipt(e.target.value)} className="mt-1.5 h-11" />
            </div>
          </div>
          <div>
            <Label>Açıklama</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={busy} className="bg-slate-900 hover:bg-slate-800">Masrafı Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
