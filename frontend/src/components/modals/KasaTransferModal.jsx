import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function KasaTransferModal({ open, onOpenChange, kasalar, onDone }) {
  const [src, setSrc] = useState("");
  const [tgt, setTgt] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) { setSrc(""); setTgt(""); setAmount(""); setDesc(""); setReceipt(""); } }, [open]);

  const submit = async () => {
    if (!src || !tgt || !amount) return toast.error("Lütfen tüm zorunlu alanları doldurun");
    setBusy(true);
    try {
      await api.post("/transfers/kasa", {
        source_kasa_id: src, target_kasa_id: tgt,
        amount: parseFloat(amount), description: desc, receipt_no: receipt
      });
      toast.success("Kasa transferi tamamlandı");
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "İşlem başarısız");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="kasa-transfer-modal">
        <DialogHeader>
          <DialogTitle className="font-serif-legal text-2xl">Kasa Arası Virman</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Kaynak Kasa</Label>
            <Select value={src} onValueChange={setSrc}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="src-kasa-select"><SelectValue placeholder="Seçin" /></SelectTrigger>
              <SelectContent>
                {kasalar.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hedef Kasa</Label>
            <Select value={tgt} onValueChange={setTgt}>
              <SelectTrigger className="mt-1.5 h-11" data-testid="tgt-kasa-select"><SelectValue placeholder="Seçin" /></SelectTrigger>
              <SelectContent>
                {kasalar.filter(k => k.id !== src).map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tutar (TL)</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5 h-11" data-testid="transfer-amount-input" />
            </div>
            <div>
              <Label>Dekont / Makbuz No</Label>
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
          <Button onClick={submit} disabled={busy} data-testid="transfer-form-submit-button" className="bg-slate-900 hover:bg-slate-800">
            Virman Yap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
