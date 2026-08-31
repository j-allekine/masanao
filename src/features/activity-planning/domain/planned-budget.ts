const PESO_AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const CENTAVOS_PER_PESO = BigInt(100);

export const MAX_SIGNED_64_BIT = BigInt("9223372036854775807");

export type PesoStringParseResult =
  | { ok: true; centavos: bigint }
  | { ok: false; reason: "invalid" | "too-large" };

export function parsePesoStringToCentavos(value: string): PesoStringParseResult {
  const normalized = value.trim();

  if (!PESO_AMOUNT_PATTERN.test(normalized)) {
    return { ok: false, reason: "invalid" };
  }

  const [wholePesos, fractionalPesos = ""] = normalized.split(".");
  const significantWholePesos = wholePesos.replace(/^0+/, "") || "0";

  if (significantWholePesos.length > 17) {
    return { ok: false, reason: "too-large" };
  }

  const centavos =
    BigInt(significantWholePesos) * CENTAVOS_PER_PESO +
    BigInt(fractionalPesos.padEnd(2, "0") || "0");

  if (centavos > MAX_SIGNED_64_BIT) {
    return { ok: false, reason: "too-large" };
  }

  return { ok: true, centavos };
}

function splitCentavos(value: bigint | string) {
  const centavos = typeof value === "bigint" ? value : BigInt(value);
  const wholePesos = centavos / CENTAVOS_PER_PESO;
  const fractionalCentavos = (centavos % CENTAVOS_PER_PESO)
    .toString()
    .padStart(2, "0");

  return { wholePesos, fractionalCentavos };
}

export function formatCentavosAsPesoInput(value: bigint | string) {
  const { wholePesos, fractionalCentavos } = splitCentavos(value);

  return `${wholePesos}.${fractionalCentavos}`;
}

export function formatCentavosAsPesos(value: bigint | string) {
  const { wholePesos, fractionalCentavos } = splitCentavos(value);
  const groupedWholePesos = wholePesos
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `₱${groupedWholePesos}.${fractionalCentavos}`;
}
