import axios from "axios";

const BACKEND_URL = "https://lex-kasa.onrender.com";
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lexkasa_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const formatTL = (n) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(Number(n || 0));

export const formatDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

export const formatDateTime = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

export default api;
