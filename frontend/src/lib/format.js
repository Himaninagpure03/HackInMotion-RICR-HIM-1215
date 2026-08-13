const currencyFmt = (fractionDigits) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

export function formatCurrency(value, fractionDigits = 2) {
  return currencyFmt(fractionDigits).format(Number(value));
}

export function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
