# 4. WhatsApp poruke — Twilio

[← Predaja](README.md)

**Šta radi:** potvrde, podsetnici, otkazivanja, poruke sa liste čekanja i izveštaji stižu na WhatsApp
umesto (ili pored) mejla — klijent bira kanal u profilu. Bez Twilio-a se WhatsApp poruke beleže kao
„preskočeno", a sve ide mejlom i push obaveštenjem.

**Trošak (okvirno):**

- Twilio naplaćuje oko 0,005 USD po poruci.
- Meta (WhatsApp) naplaćuje šablonske poruke po komadu. Podsetnik ili potvrda je „utility" poruka, oko
  0,02–0,05 USD za Srbiju, zavisno od kategorije i cenovnika Meta-e u tom trenutku.
- Broj telefona za slanje: Twilio broj košta oko 1–15 USD mesečno. Može se koristiti i postojeći broj
  salona, ali onda taj broj više ne može u običnu WhatsApp aplikaciju na telefonu.
- **Ukupno: za ~400 poruka mesečno oko 10–25 USD.**

Za uštedu, podsetnici mogu ostati na mejlu i push-u, a WhatsApp samo za potvrde i otkazivanja (Podešavanja → Obaveštenja).

## Kako se otvara (traje nekoliko dana zbog provere firme)

1. Otvoriti `https://www.twilio.com/try-twilio`, registrovati se mejlom salona i potvrditi broj telefona.
2. U Twilio konzoli:
   - **Billing:** dodati karticu i uplatiti 20 USD (Twilio je u probnom režimu dok se ne uplati);
   - **Phone Numbers:** kupiti broj, ili pripremiti broj salona koji će služiti samo za ovo.
3. **Messaging → Senders → WhatsApp Senders → New sender:**
   - povezati ili napraviti **Meta Business Portfolio** (business.facebook.com) na ime salona;
   - Meta traži verifikaciju firme: PIB / matični broj, adresu i sajt. Pripremiti izvod iz APR-a;
   - upisati ime koje klijenti vide (naziv salona), logo i opis.
4. Kad Meta odobri pošiljaoca, u Twilio-u se vide:
   - **Account SID** i **Auth Token** (Account → API keys & tokens);
   - WhatsApp broj u obliku `whatsapp:+3816...`.
5. Te tri vrednosti šaljemo nama, a mi ih upisujemo u `deploy/.env`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`

   Posle toga sledi deploy.
6. **Šabloni poruka:** WhatsApp dozvoljava slobodan tekst samo 24 h posle poruke klijenta. Za podsetnike
   i potvrde Meta traži odobrene šablone. Pre puštanja proveriti sa Twilio-om koji tekstovi idu kao šabloni
   (Content Template Builder) i, ako treba, uskladiti tekst u aplikaciji. **Ovo je zaseban zadatak za nas
   kad salon dobije pošiljaoca.**
7. Proba: klijent sa WhatsApp kanalom zakaže termin, pa se proveri da li je poruka stigla. Ishod se vidi u
   Podešavanja → Obaveštenja → Dnevnik slanja.
