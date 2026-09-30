import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Scale, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@lexkasa.com");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Hoş geldiniz");
      nav("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Giriş başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Sol panel */}
      <div className="hidden lg:flex relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1589829545856-d10d557cf95f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/70 to-slate-800/40" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Scale className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="font-serif-legal text-2xl tracking-tight">LexKasa</div>
              <div className="text-xs uppercase tracking-[0.28em] text-amber-200/80">Hukuk Bürosu · Kasa Yönetimi</div>
            </div>
          </div>
          <div className="max-w-md">
            <h1 className="font-serif-legal text-4xl leading-tight mb-4">
              Adaletin ölçüsü, <span className="text-amber-300">hesabın</span> netliğinden geçer.
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              4 kasa yapınızı, müvekkil cari hesaplarını, dava masraflarını ve vekalet ücreti alacaklarını tek bir
              yerden yönetin. Şeffaf, izlenebilir, denetime hazır.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            KVKK ve Baro etik ilkelerine uygun defter tutma yaklaşımı
          </div>
        </div>
      </div>

      {/* Sağ giriş formu */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8 border-slate-200 shadow-sm">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-800 font-semibold mb-2">Vekalet Oturumu</div>
            <h2 className="font-serif-legal text-3xl text-slate-900">Büro Girişi</h2>
            <p className="text-sm text-slate-500 mt-2">Kayıtlı hesabınızla oturum açın.</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-slate-700">E-posta</Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-700">Şifre</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-11"
                required
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={busy}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Oturumu Aç
            </Button>
            <div className="text-xs text-slate-500 border-t border-slate-100 pt-4">
              <span className="font-medium text-slate-600">Demo hesap:</span> admin@lexkasa.com / admin123
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
