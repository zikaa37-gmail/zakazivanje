import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-team-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="chip-group mb-4" aria-label="Zaposleni">
      <a class="chip" routerLink="/admin/staff" routerLinkActive="selected" data-testid="team-tab-staff">Raspored i usluge</a>
      <a class="chip" routerLink="/admin/team" routerLinkActive="selected" data-testid="team-tab-accounts">Nalozi za prijavu</a>
    </nav>
  `,
})
export class TeamTabsComponent {}
