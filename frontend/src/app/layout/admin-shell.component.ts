import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ROLE_LABELS } from '../core/models/user.model';
import { AuthService } from '../core/services/auth.service';
import { AppointmentService } from '../core/services/appointment.service';
import { BusinessSettingService } from '../core/services/business-setting.service';
import { IconDirective, IconName } from '../shared/directives/icon.directive';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  ownerOnly?: boolean;
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

  readonly roleLabel = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role ? ROLE_LABELS[role] : '';
  });

  private readonly allNav: NavItem[] = [
    { path: '/admin/dashboard', label: 'Pregled', icon: 'activity' },
    { path: '/admin/calendar', label: 'Kalendar', icon: 'calendar' },
    { path: '/admin/appointments', label: 'Termini', icon: 'check-square' },
    { path: '/admin/staff', label: 'Zaposleni', icon: 'users', ownerOnly: true },
    { path: '/admin/services', label: 'Usluge', icon: 'scissors', ownerOnly: true },
    { path: '/admin/promotions', label: 'Cene i akcije', icon: 'percent', ownerOnly: true },
    { path: '/admin/clients', label: 'Klijenti', icon: 'user' },
    { path: '/admin/reports', label: 'Izveštaji', icon: 'file-text' },
    { path: '/admin/reviews', label: 'Recenzije', icon: 'star', ownerOnly: true },
    { path: '/admin/gallery', label: 'Galerija', icon: 'image', ownerOnly: true },
    { path: '/admin/share', label: 'Podeli', icon: 'share', ownerOnly: true },
    { path: '/admin/team', label: 'Nalozi osoblja', icon: 'lock', ownerOnly: true },
    { path: '/admin/settings', label: 'Podešavanja', icon: 'sliders', ownerOnly: true },
  ];

  readonly nav = computed(() => this.allNav.filter((item) => !item.ownerOnly || this.auth.isOwner()));

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
