const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** 12000 → "$ 12.000" */
export function formatMoney(amount: number): string {
  return ars.format(amount);
}
