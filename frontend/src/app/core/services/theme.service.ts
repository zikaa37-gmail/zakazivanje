import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'zk_theme';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<AppTheme>(this.readStored());

  init(): void {
    this.apply(this.theme());
  }

  set(theme: AppTheme): void {
    this.theme.set(theme);
    localStorage.setItem(THEME_KEY, theme);
    this.apply(theme);
  }

  private apply(theme: AppTheme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private readStored(): AppTheme {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }
}
