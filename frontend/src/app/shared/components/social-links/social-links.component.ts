import { Component, computed, inject } from '@angular/core';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { socialLinks } from '../../../core/utils/social';
import { IconDirective } from '../../directives/icon.directive';

@Component({
  selector: 'app-social-links',
  standalone: true,
  imports: [IconDirective],
  template: `
    @if (links().length > 0) {
      <span class="social-links" data-testid="social-links">
        @for (link of links(); track link.network) {
          <a [href]="link.url" target="_blank" rel="noopener" [class]="'is-' + link.network" [attr.aria-label]="link.label + ' ' + link.handle" [title]="link.label" [attr.data-testid]="'social-' + link.network">
            <span [appIcon]="link.network" [iconSize]="link.network === 'facebook' ? 24 : 20" aria-hidden="true"></span>
          </a>
        }
      </span>
    }
  `,
  styles: `
    .social-links {
      display: inline-flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
    }

    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 9999px;
      color: var(--color-on-brand);
      box-shadow: 0 2px 8px var(--shadow-color);
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 14px var(--shadow-color);
      }
    }

    .is-facebook {
      background: var(--color-brand-facebook);
    }

    .is-instagram {
      background: var(--color-brand-instagram);
    }

    .is-tiktok {
      background: var(--color-brand-tiktok);
    }

    .is-youtube {
      background: var(--color-brand-youtube);
    }
  `,
})
export class SocialLinksComponent {
  private business = inject(BusinessSettingService);

  readonly links = computed(() => socialLinks(this.business.settings()));
}
