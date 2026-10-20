import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  mobileMenuOpen = signal(false);

  get currentUser() {
    return this.authService.currentUser;
  }

  get isAuthenticated() {
    return this.authService.isAuthenticated();
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }

  goToProfile(): void {
    this.closeMobileMenu();
    this.router.navigate(['/profile']);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((isOpen) => !isOpen);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
