import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function KasaEditModal({ open, onOpenChange, kasa, onDone }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && kasa) {
      setName(kasa.name || "");
      setDescription(kasa.description || "");
    }
  }, [open, kasa]);

  const submit = async () => {
    if (!name.trim()) return toast.error("Kasa adı zorunlu");
    setBusy(true);
    try {
      await api.patch(`/kasalar/${kasa.id}`, { name, description });
      toast.success("Kasa güncellendi");
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "İşlem başarısız");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="kasa-edit-modal">
        <DialogHeader>
          <DialogTitle className="font-serif-legal text-2xl">Kasayı Düzenle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Kasa Adı</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1.5 h-11"
              data-testid="kasa-edit-name-input"
            />
          </div>
          <div>
            <Label>Açıklama</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5"
              data-testid="kasa-edit-description-input"
            />
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3">
            Bakiye değiştirilmez, sadece isim ve açıklama güncellenir. Geçmiş işlem kayıtlarında eski isim korunur.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={busy} data-testid="kasa-edit-save-btn" className="bg-slate-900 hover:bg-slate-800">
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
