import { Injectable, signal } from '@angular/core';
import { isHexColor, mix, readableAccent, readableTextOn } from '../utils/color';

export type AppTheme = 'light' | 'dark';

export interface BrandColors {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
}

const THEME_KEY = 'zk_theme';
const TOKENS = ['primary', 'secondary', 'tertiary'] as const;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<AppTheme>(this.readStored());

  private brand: BrandColors = { primary: null, secondary: null, tertiary: null };

  init(): void {
    this.apply(this.theme());
  }

  set(theme: AppTheme): void {
    this.theme.set(theme);
    localStorage.setItem(THEME_KEY, theme);
    this.apply(theme);
  }

  applyBrand(colors: BrandColors): void {
    this.brand = colors;
    this.applyBrandTokens();
  }

  private apply(theme: AppTheme): void {
    document.documentElement.setAttribute('data-theme', theme);
    this.applyBrandTokens();
  }

  private applyBrandTokens(): void {
    const style = document.documentElement.style;
    const dark = this.theme() === 'dark';

    for (const token of TOKENS) {
      const base = this.brand[token];
      const names = ['', '-dark', '-active', '-tint', '-text'].map((suffix) => `--color-${token}${suffix}`).concat(`--color-on-${token}`);

      if (!isHexColor(base)) {
        names.forEach((name) => style.removeProperty(name));
        continue;
      }

      const color = dark ? mix(base, '#ffffff', 0.25) : base;
      const toward = dark ? '#ffffff' : '#000000';
      const hover = mix(color, toward, 0.18);
      const active = mix(color, toward, 0.32);
      style.setProperty(`--color-${token}`, color);
      style.setProperty(`--color-${token}-dark`, hover);
      style.setProperty(`--color-${token}-active`, active);
      const tint = dark ? mix(base, '#000000', 0.7) : mix(base, '#ffffff', 0.85);
      const surfaces = dark ? ['#292524', '#1c1917', tint] : ['#ffffff', '#f5f5f4', tint];
      style.setProperty(`--color-${token}-tint`, tint);
      style.setProperty(`--color-${token}-text`, readableAccent(color, surfaces, dark ? '#ffffff' : '#000000'));
      style.setProperty(`--color-on-${token}`, readableTextOn(color, hover, active));

      if (token === 'primary') {
        const chart = readableAccent(color, [surfaces[0]], toward, 3);
        style.setProperty('--color-chart', chart);
        style.setProperty('--color-chart-active', mix(chart, toward, 0.22));
        style.setProperty('--color-chart-track', tint);
      }
    }

    if (!isHexColor(this.brand.primary)) {
      ['--color-chart', '--color-chart-active', '--color-chart-track'].forEach((name) => style.removeProperty(name));
    }
  }

  private readStored(): AppTheme {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }
}
