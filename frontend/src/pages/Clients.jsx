import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatTL, formatDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, User } from "lucide-react";
import YeniMuvekkilModal from "@/components/modals/YeniMuvekkilModal";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    const { data } = await api.get("/clients");
    setClients(data);
  };
  useEffect(() => { refresh(); }, []);

  const filtered = clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="clients-page">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-1">Müvekkil Cari</div>
          <h1 className="font-serif-legal text-3xl text-slate-900">Müvekkil Hesapları</h1>
        </div>
        <Button data-testid="open-new-client-modal-btn" onClick={() => setOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-11">
          <Plus className="w-4 h-4 mr-2" /> Yeni Müvekkil
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Müvekkil ara…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-11" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <Card className="p-8 col-span-full text-center text-sm text-slate-500">Kayıtlı müvekkil yok</Card>
        )}
        {filtered.map(c => (
          <Link key={c.id} to={`/muvekkiller/${c.id}`}>
            <Card className="p-5 hover:border-amber-300 transition-colors cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-200 flex items-center justify-center font-serif-legal">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{c.name}</div>
                  <div className="text-xs text-slate-500 truncate">{c.phone || c.email || "—"}</div>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Cari Bakiye</div>
                  <div className={`font-mono-num text-lg font-semibold ${c.balance < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {formatTL(c.balance)}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">{formatDate(c.created_at)}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <YeniMuvekkilModal open={open} onOpenChange={setOpen} onDone={refresh} />
    </div>
  );
}
