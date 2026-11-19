import { Component, ElementRef, inject, input, signal } from '@angular/core';
import { IconDirective } from '../../directives/icon.directive';

@Component({
  selector: 'app-info-tip',
  imports: [IconDirective],
  host: {
    class: 'info-tip',
    '(document:pointerdown)': 'onDocumentPointer($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="info-tip-button"
      [attr.aria-label]="heading() || 'Objašnjenje'"
      [attr.aria-expanded]="open()"
      (click)="open.set(!open())"
    >
      <span appIcon="info" [iconSize]="18" aria-hidden="true"></span>
    </button>
    @if (open()) {
      <div class="info-tip-panel" role="dialog" [attr.aria-label]="heading() || 'Objašnjenje'">
        @if (heading()) {
          <div class="info-tip-title">{{ heading() }}</div>
        }
        <ng-content />
      </div>
    }
  `,
})
export class InfoTipComponent {
  private host = inject(ElementRef<HTMLElement>);

  readonly heading = input('');
  readonly open = signal(false);

  onDocumentPointer(event: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
