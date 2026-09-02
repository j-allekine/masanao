const PESO_AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const PESO_INPUT_PATTERN = /^\d[\d,]*(?:\.\d{0,2})?$/;
const CENTAVOS_PER_PESO = BigInt(100);

export const MAX_SIGNED_64_BIT = BigInt("9223372036854775807");

export type PesoStringParseResult =
  | { ok: true; centavos: bigint }
  | { ok: false; reason: "invalid" | "too-large" };

export type PesoInputSelection = {
  start: number;
  end: number;
};

export type PesoInputResult = {
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
};

function groupWholePesos(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function mapPesoInputPosition(
  rawValue: string,
  formattedValue: string,
  position: number,
) {
  const clampedPosition = Math.max(0, Math.min(position, rawValue.length));
  const logicalCharactersBeforePosition = rawValue
    .slice(0, clampedPosition)
    .replaceAll(",", "").length;
  let formattedPosition = 0;
  let logicalCharactersSeen = 0;

  while (
    formattedPosition < formattedValue.length &&
    logicalCharactersSeen < logicalCharactersBeforePosition
  ) {
    if (formattedValue[formattedPosition] !== ",") {
      logicalCharactersSeen += 1;
    }
    formattedPosition += 1;
  }

  return formattedPosition;
}

export function normalizePesoInput(value: string) {
  return value.trim().replace(/^₱\s*/, "").replaceAll(",", "");
}

export function formatPesoInputWhileEditing(value: string) {
  if (!PESO_INPUT_PATTERN.test(value)) return value;

  const [wholePesos, fractionalPesos] = value.split(".");
  const groupedWholePesos = groupWholePesos(
    wholePesos.replaceAll(",", ""),
  );

  return fractionalPesos === undefined
    ? groupedWholePesos
    : `${groupedWholePesos}.${fractionalPesos}`;
}

export function formatPesoInputOnBlur(value: string) {
  const normalized = normalizePesoInput(value);

  if (normalized === "") return "";
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return value;

  const [wholePesos, fractionalPesos = ""] = normalized.split(".");

  return `${groupWholePesos(wholePesos)}.${fractionalPesos.padEnd(2, "0")}`;
}

export function formatPesoInputChange(
  value: string,
  selectionStart: number | null,
  selectionEnd: number | null = selectionStart,
): PesoInputResult {
  const formattedValue = formatPesoInputWhileEditing(value);

  if (formattedValue === value) {
    return { value, selectionStart, selectionEnd };
  }

  return {
    value: formattedValue,
    selectionStart:
      selectionStart === null
        ? null
        : mapPesoInputPosition(value, formattedValue, selectionStart),
    selectionEnd:
      selectionEnd === null
        ? null
        : mapPesoInputPosition(value, formattedValue, selectionEnd),
  };
}

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
  const groupedWholePesos = groupWholePesos(wholePesos.toString());

  return `₱${groupedWholePesos}.${fractionalCentavos}`;
}
