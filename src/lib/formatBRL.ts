/** Formatação BRL determinística (evita hydration mismatch Node vs browser). */
export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return 'R$ 0,00';
  const n = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const neg = n < 0;
  const abs = Math.abs(n);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}R$ ${withDots},${decPart}`;
}

export function formatNumberPt(value: number | null | undefined, maxFrac = 2): string {
  if (value == null || Number.isNaN(Number(value))) return '0';
  const n = Number(value);
  const fixed = n.toFixed(Math.min(Math.max(maxFrac, 0), 6));
  const [intPart, decPart] = fixed.split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!decPart || /^0+$/.test(decPart)) return withDots;
  return `${withDots},${decPart.replace(/0+$/, '')}`;
}
