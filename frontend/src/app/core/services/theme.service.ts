import { Injectable, signal } from '@angular/core';
import { isHexColor, mix, readableTextOn } from '../utils/color';

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
      const names = ['', '-dark', '-active', '-tint'].map((suffix) => `--color-${token}${suffix}`).concat(`--color-on-${token}`);

      if (!isHexColor(base)) {
        names.forEach((name) => style.removeProperty(name));
        continue;
      }

      const color = dark ? mix(base, '#ffffff', 0.25) : base;
      const toward = dark ? '#ffffff' : '#000000';
      style.setProperty(`--color-${token}`, color);
      style.setProperty(`--color-${token}-dark`, mix(color, toward, 0.18));
      style.setProperty(`--color-${token}-active`, mix(color, toward, 0.32));
      style.setProperty(`--color-${token}-tint`, dark ? mix(base, '#000000', 0.7) : mix(base, '#ffffff', 0.85));
      style.setProperty(`--color-on-${token}`, readableTextOn(color));
    }
  }

  private readStored(): AppTheme {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }
}
