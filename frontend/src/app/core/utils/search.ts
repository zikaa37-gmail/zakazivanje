export function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function matchesSearch(haystack: string, query: string): boolean {
  const text = normalizeSearch(haystack);
  const digits = haystack.replace(/\D/g, '');
  return normalizeSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => text.includes(token) || (/^\+?\d+$/.test(token) && digits.includes(token.replace(/\D/g, '').replace(/^0/, ''))));
}
