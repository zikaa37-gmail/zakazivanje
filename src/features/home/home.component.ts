import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home-container">
      <h1>Dobrodošli na Zakazivanje platformu</h1>
      <p>Pronađite i zakažite termine u frizerskim salonima, restoranima, spa centrima i više!</p>
    </div>
  `,
  styles: [
    `
      .home-container {
        padding: 2rem;
        text-align: center;
      }
      h1 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }
    `,
  ],
})
export class HomeComponent {}
