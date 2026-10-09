import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function YeniMuvekkilModal({ open, onOpenChange, onDone }) {
  const [form, setForm] = useState({ name: "", tc_vkn: "", phone: "", email: "", notes: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) setForm({ name: "", tc_vkn: "", phone: "", email: "", notes: "" }); }, [open]);
  const submit = async () => {
    if (!form.name) return toast.error("Ad/Ünvan zorunlu");
    setBusy(true);
    try {
      await api.post("/clients", form);
      toast.success("Müvekkil eklendi");
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "İşlem başarısız");
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="font-serif-legal text-2xl">Yeni Müvekkil</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Ad / Ünvan</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11" data-testid="client-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>TC / VKN</Label>
              <Input value={form.tc_vkn} onChange={e => setForm({ ...form, tc_vkn: e.target.value })} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5 h-11" />
            </div>
          </div>
          <div>
            <Label>E-posta</Label>
            <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label>Notlar</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={busy} data-testid="save-client-button" className="bg-slate-900 hover:bg-slate-800">Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
