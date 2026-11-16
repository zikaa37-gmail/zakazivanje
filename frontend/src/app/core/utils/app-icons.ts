function versionOf(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += Math.max(1, Math.floor(value.length / 4000))) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `${(hash >>> 0).toString(36)}${value.length.toString(36)}`;
}

function setLink(rel: string, href: string, sizes?: string): void {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  if (sizes) link.setAttribute('sizes', sizes);
  link.type = 'image/png';
  link.href = href;
}

export function applyAppIcons(logo: string | null, name: string | null): void {
  if (typeof document === 'undefined') return;
  const version = versionOf(`${logo ?? ''}|${name ?? ''}`);
  setLink('icon', `/api/public/app-icon/64.png?v=${version}`, '64x64');
  setLink('apple-touch-icon', `/api/public/app-icon/180.png?v=${version}`, '180x180');
}
