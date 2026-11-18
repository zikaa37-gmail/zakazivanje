# 3. AI pomoćnik — Anthropic (Claude)

[← Predaja](README.md)

**Šta radi u aplikaciji:**

- predlaže usluge i kategorije po delatnosti salona („Predloži usluge");
- predlaže naziv za zaposlene („frizer", „kozmetičar"...).

Sve AI funkcije se vide samo kad je AI uključen (Podešavanja → AI pomoćnik). Bez AI-a aplikacija radi
normalno, a predlozi usluga se uzimaju iz gotovih šablona.

**Trošak:** plaća se po potrošnji, dopunom unapred (najmanje 5 USD). Aplikacija koristi model `claude-opus-5-5`,
čija je cena 4 USD na milion ulaznih i 20 USD na milion izlaznih tokena. Jedan predlog usluga je
nekoliko hiljada tokena, dakle oko 0,02–0,10 USD. Za salon to je realno **1–5 USD mesečno**, a i manje
kad se usluge jednom podese.

## Kako se otvara

1. Otvoriti `https://console.anthropic.com` i registrovati se mejlom salona (npr. `nalozi@...`).
2. Uneti podatke organizacije: naziv salona i zemlju.
3. **Billing (Plans & Billing):**
   - dodati karticu salona;
   - kupiti kredit, za početak 5–10 USD;
   - po želji uključiti automatsku dopunu sa malim iznosom i mesečni limit potrošnje (Limits), npr. 10 USD,
     da nikad ne bude iznenađenja.
4. **API Keys → Create Key:**
   - naziv `zakazivanje`;
   - ključ (`sk-ant-...`) se vidi samo jednom, odmah ga kopirati.
5. U aplikaciji: Podešavanja → AI pomoćnik → uključiti, nalepiti ključ, pa „Proveri". Ključ se čuva
   šifrovan u bazi; nikad ga ne slati mejlom ni porukom u otvorenom obliku.

Rezerva: ključ može da stoji i u `deploy/.env` kao `ANTHROPIC_API_KEY` (važi kad u aplikaciji nije upisan).
