import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { userRoleLabel } from '../core/models/user.model';
import { AuthService } from '../core/services/auth.service';
import { AppointmentService } from '../core/services/appointment.service';
import { BusinessSettingService } from '../core/services/business-setting.service';
import { StaffNoteService } from '../core/services/staff-note.service';
import { IconDirective, IconName } from '../shared/directives/icon.directive';

type NavSection = 'daily' | 'manage';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  section: NavSection;
  managerOnly?: boolean;
  alsoActive?: string[];
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, IconDirective],
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
  protected notes = inject(StaffNoteService);

  readonly menuOpen = signal(false);
  readonly initials = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase() : '';
  });

  readonly roleLabel = computed(() => {
    const user = this.auth.currentUser();
    return user ? userRoleLabel(user) : '';
  });

  private readonly allNav: NavItem[] = [
    { path: '/admin/dashboard', label: 'Pregled', icon: 'activity', section: 'daily' },
    { path: '/admin/calendar', label: 'Kalendar', icon: 'calendar', section: 'daily' },
    { path: '/admin/appointments', label: 'Termini', icon: 'check-square', section: 'daily' },
    { path: '/admin/notes', label: 'Beleške', icon: 'message-square', section: 'daily' },
    { path: '/admin/clients', label: 'Klijenti', icon: 'user', section: 'daily', managerOnly: true },
    { path: '/admin/reviews', label: 'Recenzije', icon: 'star', section: 'daily', managerOnly: true },
    { path: '/admin/reports', label: 'Izveštaji', icon: 'file-text', section: 'daily', managerOnly: true },
    { path: '/admin/staff', label: 'Zaposleni', icon: 'users', section: 'manage', managerOnly: true, alsoActive: ['/admin/team'] },
    { path: '/admin/services', label: 'Usluge', icon: 'scissors', section: 'manage', managerOnly: true },
    { path: '/admin/promotions', label: 'Cene i akcije', icon: 'percent', section: 'manage', managerOnly: true },
    { path: '/admin/gallery', label: 'Galerija', icon: 'image', section: 'manage', managerOnly: true },
    { path: '/admin/share', label: 'Podeli', icon: 'share', section: 'manage', managerOnly: true },
    { path: '/admin/settings', label: 'Podešavanja salona', icon: 'sliders', section: 'manage', managerOnly: true },
  ];

  readonly sections: { value: NavSection; label: string }[] = [
    { value: 'daily', label: 'Svakodnevno' },
    { value: 'manage', label: 'Upravljanje' },
  ];

  private router = inject(Router);
  private readonly url = signal(this.router.url);
  readonly section = signal<NavSection>(this.sectionOf(this.router.url));
  readonly allowed = computed(() => this.allNav.filter((item) => !item.managerOnly || this.auth.isManager()));
  readonly hasSections = computed(() => this.allowed().some((item) => item.section === 'manage'));
  readonly nav = computed(() => (this.hasSections() ? this.allowed().filter((item) => item.section === this.section()) : this.allowed()));

  constructor() {
    this.appointments.refreshPendingCount();
    this.notes.refreshUnreadCount();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.menuOpen.set(false);
      this.url.set(event.urlAfterRedirects);
      this.section.set(this.sectionOf(event.urlAfterRedirects));
    });
  }

  isActive(item: NavItem): boolean {
    const path = this.url().split('?')[0];
    return [item.path, ...(item.alsoActive ?? [])].some((p) => path === p || path.startsWith(p + '/'));
  }

  private sectionOf(url: string): NavSection {
    const path = url.split('?')[0];
    const item = this.allNav.find((i) => [i.path, ...(i.alsoActive ?? [])].some((p) => path === p || path.startsWith(p + '/')));
    return item?.section ?? 'daily';
  }

  logout(): void {
    this.auth.logout();
  }
}
