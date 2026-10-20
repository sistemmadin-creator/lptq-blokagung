// Tanggal YYYY-MM-DD menurut zona waktu perangkat, bukan UTC.
// toISOString() memakai UTC sehingga di WIB (UTC+7) tanggalnya mundur sehari pukul 00.00-07.00.
export function toLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
