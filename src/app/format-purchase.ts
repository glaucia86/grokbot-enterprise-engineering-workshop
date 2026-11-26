export function formatUsd(amountMinor: number) {
  const negative = amountMinor < 0;
  const cents = BigInt(Math.abs(amountMinor));
  const dollars = (cents / 100n).toLocaleString("en-US");
  const formatted = "$" + dollars + "." + String(cents % 100n).padStart(2, "0");
  return negative ? "-" + formatted : formatted;
}
