import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { crc16, isValidCNPJ, isValidCPF, isValidPixKey, pixCode, pixText } from "../src/lib/pix.ts";
import { formatCep, normalizeCep, regionForUF, ufForCep } from "../src/lib/cep.ts";
import { discountPercent, effectivePrice, formatBRL, parseReais } from "../src/lib/money.ts";
import { completeLook, conflicts, harmony, rank, type Piece } from "../src/lib/recommend.ts";
import { sniffMatches } from "../src/lib/sniff.ts";
import { sortSizes } from "../src/lib/sizes.ts";
import { verifyWebhook } from "../src/lib/payments/signature.ts";
import { canMove } from "../src/lib/order-status.ts";

// ── PIX ─────────────────────────────────────────────────────────────────
test("CRC16/CCITT-FALSE matches the standard check value", () => {
  assert.equal(crc16("123456789"), "29B1");
});

function parseTLV(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < s.length; ) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    out[id] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

test("PIX BR Code carries key, amount, merchant and txid, with a valid CRC", () => {
  const code = pixCode({ key: "pix@jamaica.test", amountCents: 71910, merchantName: "Jamaica Moda Ltda", merchantCity: "São Paulo", txid: "JM-10001" });
  const f = parseTLV(code);
  assert.equal(f["00"], "01");
  const account = parseTLV(f["26"]);
  assert.equal(account["00"], "br.gov.bcb.pix");
  assert.equal(account["01"], "pix@jamaica.test");
  assert.equal(f["53"], "986");
  assert.equal(f["54"], "719.10");
  assert.equal(f["58"], "BR");
  assert.equal(f["59"], "JAMAICA MODA LTDA");
  assert.equal(f["60"], "SAO PAULO");
  assert.equal(parseTLV(f["62"])["05"], "JM10001");
  assert.equal(code.slice(-4), crc16(code.slice(0, -4)));
});

test("PIX text is uppercase ASCII and truncated", () => {
  assert.equal(pixText("Ação Çaju Ünico Boutique Internacional", 25), "ACAO CAJU UNICO BOUTIQUE ");
});

test("CPF and CNPJ check digits", () => {
  assert.ok(isValidCPF("529.982.247-25"));
  assert.ok(!isValidCPF("529.982.247-26"));
  assert.ok(!isValidCPF("111.111.111-11"));
  assert.ok(isValidCNPJ("11.222.333/0001-81"));
  assert.ok(!isValidCNPJ("11.222.333/0001-82"));
});

test("PIX key formats", () => {
  assert.ok(isValidPixKey("pix@jamaica.test"));
  assert.ok(isValidPixKey("+55 11 91234-5678"));
  assert.ok(isValidPixKey("123e4567-e89b-12d3-a456-426614174000"));
  assert.ok(isValidPixKey("52998224725"));
  assert.ok(!isValidPixKey("11 91234-5678"));
  assert.ok(!isValidPixKey("not a key"));
});

// ── CEP and regions ─────────────────────────────────────────────────────
test("CEP normalising and fallback regions", () => {
  assert.equal(normalizeCep("01310-100"), "01310100");
  assert.equal(normalizeCep("1310-100"), null);
  assert.equal(formatCep("01310100"), "01310-100");
  assert.equal(ufForCep("01310100"), "SP");
  assert.equal(ufForCep("20040002"), "RJ");
  assert.equal(ufForCep("69005000"), "AM");
  assert.equal(ufForCep("90010000"), "RS");
  assert.equal(regionForUF("SP"), "SE");
  assert.equal(regionForUF("BA"), "NE");
  assert.equal(regionForUF("AM"), "N");
  assert.equal(regionForUF("DF"), "CO");
  assert.equal(regionForUF("XX"), null);
});

// ── Money ───────────────────────────────────────────────────────────────
test("parses prices typed in reais", () => {
  assert.equal(parseReais("349,90"), 34990);
  assert.equal(parseReais("R$ 1.299,00"), 129900);
  assert.equal(parseReais("1.299"), 129900);
  assert.equal(parseReais("349.9"), 34990);
  assert.equal(parseReais("1299"), 129900);
  assert.equal(parseReais(""), null);
  assert.equal(parseReais("abc"), null);
  assert.equal(parseReais("12,345"), null);
});

test("sale price is used only when lower", () => {
  assert.equal(effectivePrice({ price_cents: 10000, sale_price_cents: 8000 }), 8000);
  assert.equal(effectivePrice({ price_cents: 10000, sale_price_cents: null }), 10000);
  assert.equal(effectivePrice({ price_cents: 10000, sale_price_cents: 12000 }), 10000);
  assert.equal(discountPercent({ price_cents: 129000, sale_price_cents: 109000 }), 16);
  assert.equal(formatBRL(71910), "R$ 719,10");
});

// ── Outfit recommendations ──────────────────────────────────────────────
const P = (id: string, slot: Piece["slot"], palette: string, gender: Piece["gender"] = "unisex", priceCents = 30000): Piece => ({ id, slot, palette, gender, priceCents, inStock: true });

test("neutral pieces go with everything; loud colours clash", () => {
  assert.equal(harmony("neutral", "warm"), 1);
  assert.ok(harmony("warm", "blue") < harmony("warm", "neutral"));
});

test("ranking prefers harmony, right gender and similar price", () => {
  const chosen = [P("jacket", "outerwear", "warm", "men", 50000)];
  const ranked = rank([P("blue", "bottom", "blue", "men"), P("neutral", "bottom", "neutral", "men"), P("womens", "bottom", "neutral", "women")], chosen, "men");
  assert.deepEqual(ranked.map((r) => r.id), ["neutral", "blue"]);
});

test("a dress replaces top and bottoms", () => {
  assert.deepEqual(conflicts("one-piece"), ["top", "bottom"]);
  const all = [P("t", "top", "neutral"), P("b", "bottom", "blue"), P("s", "shoes", "dark")];
  const look = completeLook(all, { "one-piece": P("d", "one-piece", "warm") }, "all", ["top", "bottom", "shoes"]);
  assert.equal(look.top, undefined);
  assert.equal(look.bottom, undefined);
  assert.equal(look.shoes?.id, "s");
});

test("sold-out pieces are never recommended", () => {
  assert.deepEqual(rank([{ ...P("x", "top", "neutral"), inStock: false }], [], "all"), []);
});

// ── Uploads, sizes, statuses ────────────────────────────────────────────
test("file sniffing rejects renamed files", () => {
  assert.ok(sniffMatches(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"));
  assert.ok(sniffMatches(new TextEncoder().encode("glTF\x02\x00\x00\x00"), "model/gltf-binary"));
  assert.ok(!sniffMatches(new TextEncoder().encode("<svg onload=alert(1)>"), "image/png"));
  assert.ok(!sniffMatches(new TextEncoder().encode("MZ\x90\x00"), "model/gltf-binary"));
});

test("sizes sort the way people read them", () => {
  assert.deepEqual(sortSizes(["L", "XS", "M", "XL", "S"]), ["XS", "S", "M", "L", "XL"]);
  assert.deepEqual(sortSizes(["42", "38", "40"]), ["38", "40", "42"]);
});

test("order status transitions", () => {
  assert.ok(canMove("pending_payment", "paid"));
  assert.ok(canMove("paid", "shipped"));
  assert.ok(!canMove("pending_payment", "shipped"));
  assert.ok(!canMove("cancelled", "paid"));
  assert.ok(!canMove("delivered", "pending_payment"));
});

// ── Mercado Pago webhook signature ──────────────────────────────────────
test("Mercado Pago signature: accepts a valid one, rejects tampering", () => {
  const secret = "test-secret";
  const ts = "1742505638683";
  const manifest = `id:123456;request-id:req-1;ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  assert.ok(verifyWebhook(`ts=${ts},v1=${v1}`, "req-1", "123456", secret));
  assert.ok(!verifyWebhook(`ts=${ts},v1=${v1}`, "req-1", "999999", secret));
  assert.ok(!verifyWebhook(`ts=${ts},v1=${v1}`, "req-1", "123456", "other-secret"));
  assert.ok(!verifyWebhook(null, "req-1", "123456", secret));
});
