import { Injectable, signal } from '@angular/core';
import { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class CompletionService {
  readonly request = signal<Appointment | null>(null);
  private resolver: ((done: boolean) => void) | null = null;

  open(appointment: Appointment): Promise<boolean> {
    this.resolver?.(false);
    this.request.set(appointment);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  finish(done: boolean): void {
    this.resolver?.(done);
    this.resolver = null;
    this.request.set(null);
  }
}
