import { Injectable, effect, signal } from '@angular/core';
import { Gender } from '../../core/models/user.model';

export interface BookingDraft {
  step: number;
  serviceIds: number[];
  staffMemberId: number | null;
  staffChosen: boolean;
  date: string | null;
  time: string | null;
  note: string;
  audience: Gender | null;
  promoCode: string;
}

const KEY = 'zk_booking_draft';

const EMPTY: BookingDraft = { step: 0, serviceIds: [], staffMemberId: null, staffChosen: false, date: null, time: null, note: '', audience: null, promoCode: '' };

@Injectable({ providedIn: 'root' })
export class BookingDraftService {
  readonly draft = signal<BookingDraft>(this.read());

  constructor() {
    effect(() => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(this.draft()));
      } catch {
        return;
      }
    });
  }

  start(serviceIds: number[]): void {
    this.draft.update((draft) => ({ ...EMPTY, audience: draft.audience, promoCode: draft.promoCode, serviceIds, step: serviceIds.length ? 1 : 0 }));
  }

  patch(changes: Partial<BookingDraft>): void {
    this.draft.update((draft) => ({ ...draft, ...changes }));
  }

  reset(): void {
    this.draft.set({ ...EMPTY });
  }

  private read(): BookingDraft {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
    } catch {
      return { ...EMPTY };
    }
  }
}
