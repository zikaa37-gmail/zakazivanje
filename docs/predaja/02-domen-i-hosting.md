# 2. Domen i hosting

[← Predaja](README.md)

## Domen

- `.rs` domen se zakupljuje kod bilo kog ovlašćenog registra (lista na `rnids.rs` → Registri), oko
  1.500–3.000 din. godišnje. Često ga prodaje i sam hosting provajder.
- Može i poddomen postojećeg sajta salona (npr. `zakazi.salon-primer.rs`) — tada se ne kupuje novi domen,
  samo se u DNS-u postojećeg domena doda zapis koji pokazuje na hosting.
- Ime predlaže salon: kratko, lako za kucanje sa telefona, isto kao na Instagramu.

## Hosting

Šta hosting mora da ima (sadašnji test radi na istom tipu, cPanel):

- **PHP 8.3 ili noviji**, sa ekstenzijama: `pdo_mysql`, `mbstring`, `openssl`, `gd`, `zip`, `curl`, `intl`, `bcmath`, `gmp`;
- **MySQL / MariaDB** baza;
- **Cron Jobs** (obavezno — bez crona nema podsetnika ni mejlova);
- **SSL** (AutoSSL / Let's Encrypt, besplatno);
- **mejl nalozi** na domenu;
- FTP pristup, jer deploy ide preko FTP-a, bez SSH-a.

Okvirno 5.000–15.000 din. godišnje kod domaćih provajdera, a za jedan salon je dovoljan najmanji paket.

## Kako se otvara

1. Salon izabere provajdera i paket, plati na svoje ime.
2. Domen se veže za hosting (ako su kod istog provajdera, to je automatski; inače se u registru domena
   upišu name serveri hostinga).
3. Nama se pošalju pristupni podaci za cPanel (ili se napravi poseban FTP nalog i MySQL korisnik za nas).
4. U cPanel-u: napravi se baza i korisnik baze, mejl `obavestenja@` (vidi [mejlove](01-mejlovi.md)),
   uključi AutoSSL.

Dalje tehničke korake (upload, cron, čista baza) radimo mi — [prelazak na domen](07-prelazak-na-domen.md).
