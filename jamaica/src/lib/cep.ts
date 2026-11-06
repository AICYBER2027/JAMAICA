/** Brazilian postcode (CEP) helpers. Pure functions, safe on client and server. */

export function normalizeCep(input: string): string | null {
  const d = input.replace(/\D/g, "");
  return d.length === 8 && d !== "00000000" ? d : null;
}

export function formatCep(cep: string): string {
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

// Official CEP ranges per state (first five digits), used when the address service can't be reached.
const RANGES: [number, number, string][] = [
  [1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"],
  [40000, 48999, "BA"], [49000, 49999, "SE"], [50000, 56999, "PE"], [57000, 57999, "AL"],
  [58000, 58999, "PB"], [59000, 59999, "RN"], [60000, 63999, "CE"], [64000, 64999, "PI"],
  [65000, 65999, "MA"], [66000, 68899, "PA"], [68900, 68999, "AP"], [69000, 69299, "AM"],
  [69300, 69399, "RR"], [69400, 69899, "AM"], [69900, 69999, "AC"], [70000, 72799, "DF"],
  [72800, 72999, "GO"], [73000, 73699, "DF"], [73700, 76799, "GO"], [76800, 76999, "RO"],
  [77000, 77999, "TO"], [78000, 78899, "MT"], [79000, 79999, "MS"], [80000, 87999, "PR"],
  [88000, 89999, "SC"], [90000, 99999, "RS"],
];

export function ufForCep(cep: string): string | null {
  const n = Number(cep.slice(0, 5));
  return RANGES.find(([a, b]) => n >= a && n <= b)?.[2] ?? null;
}

const REGION: Record<string, "SE" | "S" | "CO" | "NE" | "N"> = {
  SP: "SE", RJ: "SE", ES: "SE", MG: "SE",
  PR: "S", SC: "S", RS: "S",
  DF: "CO", GO: "CO", MT: "CO", MS: "CO",
  BA: "NE", SE: "NE", AL: "NE", PE: "NE", PB: "NE", RN: "NE", CE: "NE", PI: "NE", MA: "NE",
  PA: "N", AP: "N", AM: "N", RR: "N", AC: "N", RO: "N", TO: "N",
};

export function regionForUF(uf: string): "SE" | "S" | "CO" | "NE" | "N" | null {
  return REGION[uf.toUpperCase()] ?? null;
}

export const UFS = Object.keys(REGION).sort();
