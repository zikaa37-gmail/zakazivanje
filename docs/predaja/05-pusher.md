# 5. Obaveštenja uživo — Pusher

[← Predaja](README.md)

**Šta radi:**

- kalendar, lista termina, pregled, zvonce, poruke sa klijentima i beleške se osvežavaju sami čim neko
  nešto promeni, bez ponovnog učitavanja stranice;
- osoblje odmah vidi novi online termin.

Bez Pushera sve radi, samo se novo vidi tek posle osvežavanja stranice.

**Trošak:** besplatni **Sandbox** paket dozvoljava 100 istovremenih veza i 200.000 poruka dnevno, što je
za salon više nego dovoljno. Plaćeni paket (od 49 USD mesečno) treba tek za mnogo veći broj korisnika.

## Kako se otvara

1. Otvoriti `https://dashboard.pusher.com/accounts/sign_up` i registrovati se mejlom salona
   (ili `nalozi@...`).
2. **Channels → Create app:**
   - naziv `zakazivanje-<salon>`;
   - cluster **eu** (Evropa);
   - frontend „Angular", backend „Laravel" (to je samo za primere, nije bitno).
3. U aplikaciji na Pusher-u → **App Keys** se vide vrednosti `app_id`, `key`, `secret` i `cluster`.
4. Šaljemo ih nama, a mi ih upisujemo u `deploy/.env`:
   - `PUSHER_APP_ID`
   - `PUSHER_APP_KEY`
   - `PUSHER_APP_SECRET`
   - `PUSHER_APP_CLUSTER=eu`

   Posle toga sledi deploy.
5. Ostala podešavanja aplikacije na Pusher-u ostaju podrazumevana („client events" ne treba uključivati).
6. Proba: na dva uređaja otvoriti kalendar, pomeriti termin na jednom i proveriti da se pomera i na
   drugom.

> Sadašnji test (`zakazivanje.fiskultura.rs`) koristi naš Pusher nalog. Za salon se pravi **nova aplikacija**, da
> test i pravi salon ne dele kanale.
