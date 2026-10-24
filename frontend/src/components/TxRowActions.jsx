import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const TxRowActions = ({ tx, onEdit, onChanged }) => {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/transactions/${tx.id}`);
      toast.success("İşlem silindi, bakiyeler yeniden hesaplandı");
      setConfirm(false);
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Silme başarısız");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="ghost" onClick={() => onEdit(tx)} className="h-8 px-2 text-slate-600 hover:text-slate-900" data-testid={`tx-edit-btn-${tx.id}`}>
        <Pencil className="w-3.5 h-3.5 mr-1" /> Düzenle
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" data-testid={`tx-delete-btn-${tx.id}`}>
        <Trash2 className="w-3.5 h-3.5 mr-1" /> Sil
      </Button>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent data-testid="tx-delete-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem kalıcı olarak silinecek ve ilgili kasa ile müvekkil bakiyeleri yeniden hesaplanacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="tx-delete-cancel-btn">Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={busy} className="bg-rose-600 hover:bg-rose-700" data-testid="tx-delete-confirm-btn">
              Evet, sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
