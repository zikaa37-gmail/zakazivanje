import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { AppointmentService } from '../core/services/appointment.service';
import { BusinessSettingService } from '../core/services/business-setting.service';
import { IconDirective, IconName } from '../shared/directives/icon.directive';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconDirective],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
  host: {
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
})
export class AdminShellComponent {
  protected auth = inject(AuthService);
  protected business = inject(BusinessSettingService);
  protected appointments = inject(AppointmentService);

  readonly menuOpen = signal(false);
  readonly initials = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase() : '';
  });

  readonly nav: NavItem[] = [
    { path: '/admin/dashboard', label: 'Pregled', icon: 'activity' },
    { path: '/admin/calendar', label: 'Kalendar', icon: 'calendar' },
    { path: '/admin/appointments', label: 'Termini', icon: 'check-square' },
    { path: '/admin/staff', label: 'Zaposleni', icon: 'users' },
    { path: '/admin/services', label: 'Usluge', icon: 'scissors' },
    { path: '/admin/promotions', label: 'Cene i akcije', icon: 'percent' },
    { path: '/admin/clients', label: 'Klijenti', icon: 'user' },
    { path: '/admin/settings', label: 'Podešavanja', icon: 'sliders' },
  ];

  constructor() {
    this.appointments.refreshPendingCount();
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  logout(): void {
    this.auth.logout();
  }
}
