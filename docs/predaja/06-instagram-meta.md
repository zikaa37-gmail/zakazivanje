# 6. Instagram i Meta

[← Predaja](README.md)

**Šta radi:**

- objave sa Instagrama na početnoj strani;
- statistika: doseg, posete profilu i klikovi na link, u Pregled → „Odakle dolaze klijenti";
- objavljivanje slika i story-ja iz Podeli → „Objavi na Instagram", odmah ili zakazano;
- automatski story „Slobodni termini".

Sve je opciono, a svaka funkcija ima svoj prekidač u Podešavanja → Instagram i Meta.

**Trošak:** besplatno.

## Šta salon mora da ima

- Instagram nalog salona prebačen u **profesionalni** (Business ili Creator): Instagram → Podešavanja →
  Tip naloga i alati.
- Facebook stranicu salona povezanu sa Instagramom (Meta Business Suite) — Meta to traži za statistiku i objavljivanje.

## Dva načina povezivanja

**A) „Poveži sa Instagramom" (preporučeno)** — vlasnik samo klikne dugme u Podešavanjima i prijavi se.
Za to mora postojati **Meta aplikacija** (jednom, za ovaj salon):

1. Otvoriti `https://developers.facebook.com` i prijaviti se Facebook nalogom vlasnika (ili admina
   stranice), pa **My Apps → Create App**, tip „Business".
2. Dodati proizvod **Instagram** (Instagram API with Instagram Login).
3. **Valid OAuth Redirect URI:** `https://<domen-salona>/api/public/instagram/callback`; ista adresa ide u
   `INSTAGRAM_REDIRECT_URI`.
4. **App ID** i **App Secret** šaljemo nama, za `deploy/.env`:
   - `INSTAGRAM_APP_ID`
   - `INSTAGRAM_APP_SECRET`
   - `INSTAGRAM_REDIRECT_URI`

   Posle toga sledi deploy.
5. Dok je Meta aplikacija u razvojnom režimu, radi samo za naloge dodate kao testeri (App Roles). Za
   **objavljivanje** (`instagram_content_publish`) i statistiku treba **App Review** kod Meta-e:
   - opis i snimak ekrana kako se koristi;
   - obično traje nekoliko dana do dve nedelje;
   - Meta može tražiti i verifikaciju firme (isti Business Portfolio kao za [WhatsApp](04-whatsapp-twilio.md)).

**B) Ručni token** — bez Meta aplikacije u našem `.env`. Token se napravi u Graph API Explorer-u i nalepi u
Podešavanja → Instagram i Meta. Brže je za početak, ali token treba obnavljati. Uputstvo je u samom ekranu
podešavanja.

Test nalozi koje smo koristili (`@zikaadev` i test Facebook) se **ne prenose** — salon povezuje svoj Instagram.
