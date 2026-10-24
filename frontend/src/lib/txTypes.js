export const TX_TYPES = {
  kasa_transfer: "Kasa Virmanı",
  client_to_kasa: "Müvekkilden Tahsilat",
  kasa_to_client: "Müvekkile Ödeme",
  expense: "Dava Masrafı",
  receivable_collection: "Vekalet Tahsilatı",
};

export const CLIENT_TX_TYPES = ["client_to_kasa", "kasa_to_client", "expense"];

export const EXPENSE_TYPES = ["Adli Harç", "Bilirkişi Ücreti", "Keşif Masrafı", "Tebligat / Posta", "Baro Pulu", "Vekaletname", "Diğer"];

export const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
