export function formatUsd(amountMinor: number) {
  const cents = BigInt(amountMinor);
  const dollars = (cents / 100n).toLocaleString("en-US");
  return "$" + dollars + "." + String(cents % 100n).padStart(2, "0");
}
