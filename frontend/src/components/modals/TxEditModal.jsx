import { useEffect, useState } from "react";
import api from "@/lib/api";
import { TX_TYPES, CLIENT_TX_TYPES, EXPENSE_TYPES, toLocalInput } from "@/lib/txTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const Pick = ({ label, value, onChange, items, testId, disabled }) => (
  <div>
    <Label>{label}</Label>
    <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="mt-1.5 h-11" data-testid={testId}><SelectValue placeholder="Seçin" /></SelectTrigger>
      <SelectContent>{items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

export default function TxEditModal({ tx, onOpenChange, kasalar, clients, onDone }) {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (tx) setF({ ...tx, amount: String(tx.amount), date: toLocalInput(tx.date), expense_type: tx.expense_type || EXPENSE_TYPES[0] });
  }, [tx]);

  if (!tx) return null;
  const isTransfer = f.type === "kasa_transfer";
  const isClientType = CLIENT_TX_TYPES.includes(f.type);
  const kasaItems = kasalar.map((k) => [k.id, k.name]);

  const submit = async () => {
    const amount = parseFloat(f.amount);
    if (!amount || amount <= 0) return toast.error("Tutar sıfırdan büyük olmalı");
    const body = { type: f.type, amount, description: f.description || "", date: f.date ? new Date(f.date).toISOString() : undefined };
    if (isTransfer) Object.assign(body, { source_kasa_id: f.source_kasa_id, target_kasa_id: f.target_kasa_id });
    else body.kasa_id = f.kasa_id;
    if (isClientType) body.client_id = f.client_id;
    if (f.type === "expense") body.expense_type = f.expense_type;
    setBusy(true);
    try {
      await api.patch(`/transactions/${tx.id}`, body);
      toast.success("İşlem güncellendi, bakiyeler yeniden hesaplandı");
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Güncelleme başarısız");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!tx} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="tx-edit-modal">
        <DialogHeader><DialogTitle className="font-serif-legal text-2xl">İşlemi Düzenle</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Pick label="İşlem Türü" value={f.type} onChange={set("type")} testId="tx-edit-type-select"
              disabled={!CLIENT_TX_TYPES.includes(tx.type)}
              items={(CLIENT_TX_TYPES.includes(tx.type) ? CLIENT_TX_TYPES : [tx.type]).map((t) => [t, TX_TYPES[t]])} />
            <div>
              <Label>Tutar (TL)</Label>
              <Input type="number" step="0.01" value={f.amount || ""} onChange={(e) => set("amount")(e.target.value)} className="mt-1.5 h-11" data-testid="tx-edit-amount-input" />
            </div>
          </div>
          {isTransfer ? (
            <div className="grid grid-cols-2 gap-3">
              <Pick label="Kaynak Kasa" value={f.source_kasa_id} onChange={set("source_kasa_id")} items={kasaItems} testId="tx-edit-source-kasa-select" />
              <Pick label="Hedef Kasa" value={f.target_kasa_id} onChange={set("target_kasa_id")} items={kasaItems} testId="tx-edit-target-kasa-select" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Pick label="Kasa" value={f.kasa_id} onChange={set("kasa_id")} items={kasaItems} testId="tx-edit-kasa-select" />
              {isClientType && <Pick label="Müvekkil" value={f.client_id} onChange={set("client_id")} items={clients.map((c) => [c.id, c.name])} testId="tx-edit-client-select" />}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {f.type === "expense" && <Pick label="Masraf Türü" value={f.expense_type} onChange={set("expense_type")} items={EXPENSE_TYPES.map((t) => [t, t])} testId="tx-edit-expense-type-select" />}
            <div>
              <Label>Tarih</Label>
              <Input type="datetime-local" value={f.date || ""} onChange={(e) => set("date")(e.target.value)} className="mt-1.5 h-11" data-testid="tx-edit-date-input" />
            </div>
          </div>
          <div>
            <Label>Açıklama</Label>
            <Textarea value={f.description || ""} onChange={(e) => set("description")(e.target.value)} rows={2} className="mt-1.5" data-testid="tx-edit-description-input" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="tx-edit-cancel-btn">İptal</Button>
          <Button onClick={submit} disabled={busy} className="bg-slate-900 hover:bg-slate-800" data-testid="tx-edit-save-btn">Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
