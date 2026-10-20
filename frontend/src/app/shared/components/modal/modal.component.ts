import { AfterViewInit, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { ButtonDirective } from '../../directives/button.directive';
import { IconDirective, IconName } from '../../directives/icon.directive';

export type ModalSize = 's' | 'm' | 'l' | 'xl';
export type ModalFooterMode = 'default' | 'custom' | 'none';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [ButtonDirective, IconDirective],
  templateUrl: './modal.component.html',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ModalComponent implements AfterViewInit {
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  readonly title = input('');
  readonly size = input<ModalSize>('m');
  readonly footerMode = input<ModalFooterMode>('default');
  readonly confirmLabel = input('Potvrdi');
  readonly cancelLabel = input('Otkaži');
  readonly confirmIcon = input<IconName | null>('check');
  readonly cancelIcon = input<IconName | null>('close');
  readonly confirmDisabled = input(false);
  readonly danger = input(false);
  readonly closeOnBackdrop = input(true);
  readonly testId = input('');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onEscape(): void {
    this.cancelled.emit();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.focusInitial());
  }

  onEnter(event: Event): void {
    if (this.footerMode() !== 'default' || this.confirmDisabled()) return;

    const target = event.target as HTMLElement;
    if (target !== this.panel().nativeElement && !this.isTextEntry(target)) return;

    event.preventDefault();
    this.confirmed.emit();
  }

  private isTextEntry(element: HTMLElement): boolean {
    return element instanceof HTMLInputElement && !['button', 'submit', 'checkbox', 'radio', 'file'].includes(element.type);
  }

  private focusInitial(): void {
    const panel = this.panel().nativeElement;
    if (panel.contains(document.activeElement) && document.activeElement !== panel) return;

    const firstField = window.matchMedia('(pointer: fine)').matches
      ? panel.querySelector<HTMLElement>(
          '.modal-body input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([disabled]), .modal-body textarea:not([disabled])',
        )
      : null;

    (firstField ?? panel).focus({ preventScroll: true });
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) this.cancelled.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    this.confirmed.emit();
  }
}
