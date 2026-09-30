import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AlacakModal({ open, onOpenChange, clients, onDone, defaultClientId }) {
  const [clientId, setClientId] = useState("");
  const [feeType, setFeeType] = useState("akdi");
  const [total, setTotal] = useState("");
  const [collected, setCollected] = useState("0");
  const [fileNo, setFileNo] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setClientId(defaultClientId || ""); setFeeType("akdi"); setTotal(""); setCollected("0"); setFileNo(""); setDesc(""); }
    else if (defaultClientId) setClientId(defaultClientId);
  }, [open, defaultClientId]);

  const submit = async () => {
    if (!clientId || !total) return toast.error("Müvekkil ve toplam ücret zorunlu");
    setBusy(true);
    try {
      await api.post("/receivables", {
        client_id: clientId, fee_type: feeType,
        total_amount: parseFloat(total), collected_amount: parseFloat(collected || 0),
        file_no: fileNo, description: desc,
      });
      toast.success("Vekalet alacağı kaydedildi");
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
          <DialogTitle className="font-serif-legal text-2xl">Vekalet Ücreti Alacağı</DialogTitle>
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
              <Label>Alacak Türü</Label>
              <Select value={feeType} onValueChange={setFeeType}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="akdi">Akdi Vekalet Ücreti</SelectItem>
                  <SelectItem value="karsi_yan">Karşı Yan Vekalet Ücreti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Toplam Ücret (TL)</Label>
              <Input type="number" step="0.01" value={total} onChange={e => setTotal(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label>Tahsil Edilen (Peşin)</Label>
              <Input type="number" step="0.01" value={collected} onChange={e => setCollected(e.target.value)} className="mt-1.5 h-11" />
            </div>
          </div>
          <div>
            <Label>Dosya Esas No</Label>
            <Input value={fileNo} onChange={e => setFileNo(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label>Açıklama</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={busy} className="bg-slate-900 hover:bg-slate-800">Alacağı Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
