import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <main class="content-container py-10">
      <div class="card text-center">
        <h1 class="text-2xl">Zakazivanje</h1>
        <p class="text-[var(--color-text-muted)]">Stranice se prave po odobrenom predlogu.</p>
      </div>
    </main>
  `,
})
export class HomeComponent {}
