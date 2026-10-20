import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmOptions | null>(null);
  private resolver: ((result: boolean) => void) | null = null;

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.resolver?.(false);
    this.request.set(options);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  respond(result: boolean): void {
    this.resolver?.(result);
    this.resolver = null;
    this.request.set(null);
  }
}
