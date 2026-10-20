import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  position: ToastPosition;
  duration: number;
}

export interface ToastOptions {
  type?: ToastType;
  position?: ToastPosition;
  duration?: number;
}

const DEFAULT_DURATION = 4000;
const DEFAULT_POSITION: ToastPosition = 'bottom-right';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, options: ToastOptions = {}): number {
    const id = this.nextId++;
    const duration = options.duration ?? DEFAULT_DURATION;

    this.toasts.update((list) => [
      ...list,
      {
        id,
        message,
        type: options.type ?? 'info',
        position: options.position ?? DEFAULT_POSITION,
        duration,
      },
    ]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  success(message: string, options: Omit<ToastOptions, 'type'> = {}): number {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message: string, options: Omit<ToastOptions, 'type'> = {}): number {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message: string, options: Omit<ToastOptions, 'type'> = {}): number {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message: string, options: Omit<ToastOptions, 'type'> = {}): number {
    return this.show(message, { ...options, type: 'info' });
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
