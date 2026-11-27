const utcDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatUsd(amountMinor: number) {
  const negative = amountMinor < 0;
  const cents = BigInt(Math.abs(Math.trunc(amountMinor)));
  const dollars = (cents / 100n).toLocaleString("en-US");
  const formatted = "$" + dollars + "." + String(cents % 100n).padStart(2, "0");
  return negative ? "-" + formatted : formatted;
}

export function formatUtcTimestamp(date: Date) {
  return `${utcDateFormatter.format(date)} UTC`;
}

export function computeUtilizationPercent(allocatedBudgetMinor: number, committedBudgetMinor: number) {
  if (allocatedBudgetMinor <= 0) return committedBudgetMinor > 0 ? 100 : 0;
  return Math.round((committedBudgetMinor / allocatedBudgetMinor) * 100);
}
