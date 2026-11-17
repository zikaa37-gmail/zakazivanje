# Predaja aplikacije salonu

Šta treba uraditi da aplikacija pređe sa test adrese `zakazivanje.fiskultura.rs` na domen salona i da salon
počne da je koristi sa pravim klijentima. Svaki nalog ima svoje kratko uputstvo (linkovi ispod).

> **Pravilo:** svi nalozi se otvaraju **na ime salona**, sa mejlom salona i karticom salona. Mi dobijamo pristup
> (ključeve), ali vlasnik ostaje salon — ako se saradnja završi, salonu ništa ne prestaje da radi.

## Redosled

1. [Mejlovi salona](01-mejlovi.md) — prvo, jer se svi ostali nalozi otvaraju na neki od njih.
2. [Domen i hosting](02-domen-i-hosting.md) — adresa sajta, server, baza, slanje mejlova.
3. Spoljni servisi (svaki je opcioni, aplikacija radi i bez njih, samo bez te funkcije):
   - [AI pomoćnik — Anthropic (Claude)](03-ai-anthropic.md)
   - [WhatsApp poruke — Twilio](04-whatsapp-twilio.md)
   - [Obaveštenja uživo — Pusher](05-pusher.md)
   - [Instagram i Meta](06-instagram-meta.md)
4. [Prelazak na novi domen i čista baza](07-prelazak-na-domen.md) — tehnički koraci (radimo mi).
5. [Prvo podešavanje u aplikaciji](08-prvo-podesavanje.md) — vlasnik, nalozi, zaposleni, usluge (zajedno sa salonom).

## Troškovi — da salon zna unapred

Okvirne cene (novembar 2026, proveriti pred predaju; devizni iznosi se plaćaju karticom u dolarima / evrima).

| Šta | Obavezno? | Okvirno | Plaća se |
|-----|-----------|---------|----------|
| Domen `.rs` | da | 1.500–3.000 din. | godišnje |
| Hosting (cPanel, PHP 8.3+, MySQL, cron, SSL) | da | 5.000–15.000 din. | godišnje |
| Mejl na domenu (u hostingu) | da | uključeno u hosting | — |
| SSL sertifikat (Let's Encrypt / AutoSSL) | da | besplatno | — |
| Push obaveštenja na telefon (Web Push) | ne | besplatno (bez naloga) | — |
| Google mapa „Kako do nas" | ne | besplatno (bez ključa) | — |
| AI pomoćnik (Anthropic) | ne | ~1–5 USD mesečno (dopuna unapred, najmanje 5 USD) | po potrošnji |
| WhatsApp (Twilio + Meta) | ne | ~0,02–0,06 USD po poruci + broj ~1–15 USD mesečno | po poruci |
| Obaveštenja uživo (Pusher) | ne | besplatno (Sandbox); 49 USD mesečno tek za veliki salon | mesečno |
| Instagram / Meta aplikacija | ne | besplatno | — |
| IPS QR plaćanje (račun salona) | ne | besplatno (banka može naplatiti prijem uplate) | — |
| Kartično plaćanje preko interneta | ne | nije uključeno — ugovor sa bankom, posebna izrada | — |

**Primer za mali salon (3–4 radnika, ~400 termina mesečno):**

- obavezno: domen i hosting, oko **7.000–18.000 din. godišnje**;
- AI: oko **3 USD mesečno**;
- WhatsApp samo za podsetnike: oko 400 poruka, što je **10–25 USD mesečno**;
- Pusher: besplatno.

Bez WhatsApp-a podsetnici idu mejlom i preko push obaveštenja, besplatno.

## Ko otvara šta

| Nalog | Otvara | Šta nam treba od salona |
|-------|--------|-------------------------|
| Mejlovi | mi u hostingu, salon bira imena | spisak imena i ko koristi koji mejl |
| Domen i hosting | salon (ili mi uz njihovu karticu) | pristup cPanel-u |
| Anthropic | salon, mi pomažemo | API ključ (upisuje se u aplikaciji) |
| Twilio / WhatsApp | salon (verifikacija firme ide na njih) | Account SID, Auth Token, WhatsApp broj |
| Pusher | mi ili salon | App ID, Key, Secret, Cluster |
| Meta / Instagram | salon (Instagram mora biti njihov) | App ID, App Secret, ili samo prijava preko „Poveži sa Instagramom" |

## Pre prvog pravog klijenta (kontrolna lista)

- [ ] Mejlovi napravljeni i stižu (i u Gmail, ne u spam).
- [ ] Domen radi na `https://` (SSL).
- [ ] Čista baza: nema demo klijenata, termina, test naloga ni brze prijave (`QUICK_LOGIN_EMAILS` prazno).
- [ ] Vlasnik i administrativni radnik imaju svoje naloge i lozinke koje su sami postavili.
- [ ] Cron radi: podsetnici i mejlovi stižu.
- [ ] Podaci o salonu, logo, radno vreme, zaposleni, usluge i cene upisani.
- [ ] Ako se koristi: račun salona (IPS QR), AI ključ, WhatsApp, Pusher, Instagram.
- [ ] Politika privatnosti i uslovi korišćenja (aplikacija čuva ime, telefon i mejl klijenata —
      Zakon o zaštiti podataka o ličnosti). Tekst daje salon (ili pravnik); mi ga stavljamo na sajt.
- [ ] Rezervna kopija baze uključena u hostingu (cPanel → Backup), bar jednom nedeljno.
- [ ] Uputstvo (`/uputstvo/`) poslato vlasniku i radnicima; `klijent.html` može klijentima.
