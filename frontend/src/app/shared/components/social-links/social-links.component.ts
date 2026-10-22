import { Component, computed, inject, input } from '@angular/core';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { socialLinks } from '../../../core/utils/social';
import { IconDirective } from '../../directives/icon.directive';

@Component({
  selector: 'app-social-links',
  standalone: true,
  imports: [IconDirective],
  template: `
    @if (links().length > 0) {
      <span class="social-links" [class.with-handle]="showHandle()" data-testid="social-links">
        @for (link of links(); track link.network) {
          <a [href]="link.url" target="_blank" rel="noopener" [attr.aria-label]="link.label" [title]="link.label" [attr.data-testid]="'social-' + link.network">
            <span [appIcon]="link.network" [iconSize]="20" aria-hidden="true"></span>
            @if (showHandle()) {
              <span>{{ link.handle }}</span>
            }
          </a>
        }
      </span>
    }
  `,
  styles: `
    .social-links {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-width: 2.5rem;
      min-height: 2.5rem;
      border-radius: var(--radius);
      color: var(--color-text-muted);

      &:hover {
        color: var(--color-primary-text);
        background: var(--color-primary-tint);
      }
    }

    .with-handle {
      flex-direction: column;
      gap: 0.1rem;

      a {
        justify-content: flex-start;
        min-height: 2rem;
        color: var(--color-text);
        font-size: 0.875rem;
      }
    }
  `,
})
export class SocialLinksComponent {
  private business = inject(BusinessSettingService);

  readonly showHandle = input(false);
  readonly links = computed(() => socialLinks(this.business.settings()));
}
