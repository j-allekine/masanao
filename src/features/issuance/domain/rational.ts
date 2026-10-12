export type Rational = { numerator: bigint; denominator: bigint };

function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a < BigInt(0) ? -a : a;
}
export function rational(numerator: bigint, denominator = BigInt(1)): Rational {
  if (denominator === BigInt(0)) throw new Error("Cannot divide by zero.");
  if (denominator < BigInt(0)) { numerator = -numerator; denominator = -denominator; }
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
export function decimalRational(value: string): Rational {
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error("Invalid exact decimal.");
  const [whole, fraction = ""] = value.split(".");
  return rational(BigInt(whole + fraction), BigInt(10) ** BigInt(fraction.length));
}
export function addRational(a: Rational, b: Rational): Rational {
  return rational(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
}
export function multiplyRational(a: Rational, b: Rational): Rational {
  return rational(a.numerator * b.numerator, a.denominator * b.denominator);
}
export function divideRational(a: Rational, b: Rational): Rational {
  return rational(a.numerator * b.denominator, a.denominator * b.numerator);
}
export function isWholeRational(value: Rational) { return value.denominator === BigInt(1); }
export function compareRational(a: Rational, b: Rational) {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator;
  return difference < BigInt(0) ? -1 : difference > BigInt(0) ? 1 : 0;
}
function scaledDecimal(integer: bigint, places: number) {
  const sign = integer < BigInt(0) ? "-" : "";
  const digits = (integer < BigInt(0) ? -integer : integer).toString().padStart(places + 1, "0");
  if (!places) return sign + digits;
  return sign + `${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/\.?0+$/, "");
}
export function roundRational(value: Rational, places = 6): string {
  const magnitude = value.numerator < BigInt(0) ? -value.numerator : value.numerator;
  const scaled = magnitude * BigInt(10) ** BigInt(places);
  const quotient = scaled / value.denominator;
  const rounded = quotient + (scaled % value.denominator * BigInt(2) >= value.denominator ? BigInt(1) : BigInt(0));
  return scaledDecimal(value.numerator < BigInt(0) ? -rounded : rounded, places);
}
export function finiteDecimal(value: Rational): string | null {
  let denominator = value.denominator;
  let twos = 0; let fives = 0;
  while (denominator % BigInt(2) === BigInt(0)) { denominator /= BigInt(2); twos++; }
  while (denominator % BigInt(5) === BigInt(0)) { denominator /= BigInt(5); fives++; }
  if (denominator !== BigInt(1)) return null;
  const places = Math.max(twos, fives);
  return scaledDecimal(value.numerator * (BigInt(10) ** BigInt(places) / value.denominator), places);
}
export function displayRational(value: Rational): { quantity: string; approximate: boolean } {
  const exact = finiteDecimal(value);
  return { quantity: exact ?? roundRational(value), approximate: exact === null };
}
export function recipeContribution(quantity: string, targetPax: number, baselinePax: number, factor = "1"): Rational {
  return multiplyRational(multiplyRational(decimalRational(quantity), rational(BigInt(targetPax), BigInt(baselinePax))), decimalRational(factor));
}

