import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Transfers from "@/pages/Transfers";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Expenses from "@/pages/Expenses";
import Receivables from "@/pages/Receivables";
import Reports from "@/pages/Reports";
import Ledger from "@/pages/Ledger";
import { Toaster } from "@/components/ui/sonner";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="font-mono-num text-sm text-slate-500 tracking-widest">YÜKLENİYOR…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/giris" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/giris" element={<Login />} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index element={<Dashboard />} />
              <Route path="transferler" element={<Transfers />} />
              <Route path="muvekkiller" element={<Clients />} />
              <Route path="muvekkiller/:id" element={<ClientDetail />} />
              <Route path="masraflar" element={<Expenses />} />
              <Route path="alacaklar" element={<Receivables />} />
              <Route path="raporlar" element={<Reports />} />
              <Route path="hareketler" element={<Ledger />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
