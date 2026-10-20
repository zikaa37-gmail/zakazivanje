import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { BusinessSettingService } from '../core/services/business-setting.service';
import { IconDirective, IconName } from '../shared/directives/icon.directive';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  exact: boolean;
}

@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconDirective],
  templateUrl: './public-shell.component.html',
  styleUrl: './public-shell.component.scss',
})
export class PublicShellComponent {
  protected auth = inject(AuthService);
  protected business = inject(BusinessSettingService);

  readonly initials = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase() : '';
  });

  readonly nav = computed<NavItem[]>(() => [
    { path: '/', label: 'Početna', icon: 'home', exact: true },
    { path: '/book', label: 'Zakaži', icon: 'calendar', exact: false },
    ...(this.auth.isAuthenticated()
      ? [
          { path: '/my-appointments', label: 'Moji termini', icon: 'check-square' as IconName, exact: false },
          { path: '/profile', label: 'Profil', icon: 'user' as IconName, exact: false },
        ]
      : [{ path: '/login', label: 'Prijava', icon: 'user' as IconName, exact: false }]),
  ]);
}
