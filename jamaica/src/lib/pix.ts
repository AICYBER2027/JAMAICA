/**
 * PIX "copia e cola" (BR Code) for the store's own PIX key, following the Banco Central do Brasil
 * EMV QR Code specification (Manual de Padrões para Iniciação do Pix). The code carries the exact
 * amount and the order number as its reference, so any Brazilian bank app can pay it.
 *
 * A static code cannot tell us when it was paid: staff confirm receipt in the dashboard
 * (or use Mercado Pago, which confirms automatically).
 */

const field = (id: string, value: string) => {
  if (value.length > 99) throw new Error(`PIX field ${id} is too long`);
  return id + String(value.length).padStart(2, "0") + value;
};

/** Uppercase ASCII without accents, as the spec requires for name and city. */
export function pixText(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);
}

/** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as used by the BR Code. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizePixKey(key: string): string {
  const k = key.trim();
  if (k.includes("@")) return k.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  if (k.startsWith("+")) return "+" + k.replace(/\D/g, "");
  return k.replace(/\D/g, "");
}

export function isValidCPF(v: string): boolean {
  const d = v.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

export function isValidCNPJ(v: string): boolean {
  const d = v.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((s, w, i) => s + w * Number(d[i]), 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function isValidPixKey(key: string): boolean {
  const k = normalizePixKey(key);
  if (k.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k) && k.length <= 77;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(k)) return true;
  if (k.startsWith("+")) return /^\+55\d{10,11}$/.test(k);
  return isValidCPF(k) || isValidCNPJ(k);
}

export function pixCode(opts: { key: string; amountCents: number; merchantName: string; merchantCity: string; txid: string; description?: string }): string {
  const account =
    field("00", "br.gov.bcb.pix") +
    field("01", normalizePixKey(opts.key)) +
    (opts.description ? field("02", pixText(opts.description, 40)) : "");
  const txid = opts.txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const payload =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    field("54", (opts.amountCents / 100).toFixed(2)) +
    field("58", "BR") +
    field("59", pixText(opts.merchantName, 25) || "LOJA") +
    field("60", pixText(opts.merchantCity, 15) || "BRASIL") +
    field("62", field("05", txid)) +
    "6304";
  return payload + crc16(payload);
}
