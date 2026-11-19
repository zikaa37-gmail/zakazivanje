export function formatRsd(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  const formatted = num.toLocaleString('sr-Latn-RS', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} din.`;
}

export function formatSrDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}
