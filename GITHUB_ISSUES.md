# TASKOVI ZA GITHUB PROJECTS

Kopiraj svaki task u novi GitHub Issue na: https://github.com/zikaa37-gmail/zakazivanje/issues/new

---

## Issue 1: Kreiranje biznisa nakon registracije provajdera

**Labels:** backend, enhancement, database

**Opis:**

Nakon uspešne registracije provajdera, automatski kreirati Business entitet i povezati ga sa korisničkim nalogom.

**Taskovi:**

- [ ] Kreirati Business model u bazi
- [ ] Dodati logiku kreiranja biznisa u registerBusiness servis
- [ ] Ažurirati API response da vrati businessId
- [ ] Dodati frontend obradu za prikaz business podataka
- [ ] Ažurirati dokumentaciju

**Kriterijumi prihvatanja:**

- Business entitet se kreira automatski pri registraciji provajdera
- Business je povezan sa provider userId
- API vraća businessId u response-u

---

## Issue 2: Upravljanje uslugama (CRUD)

**Labels:** backend, frontend, enhancement

**Opis:**

Implementirati kompletan CRUD za usluge koje biznisi nude.

**Funkcionalnosti:**

- Kreiranje usluge (naziv, opis, trajanje, cena, kategorija)
- Prikaz liste usluga (sa filterima)
- Izmena podataka o usluzi
- Brisanje/deaktivacija usluge
- Upload slike usluge

**Taskovi:**

- [ ] Kreirati Service model (Sequelize)
- [ ] Napraviti Service controller i rute
- [ ] Dodati validacione schema fajlove
- [ ] Napraviti frontend formu za uslugu
- [ ] Napraviti komponentu liste usluga
- [ ] Dodati Swagger dokumentaciju

**Kriterijumi prihvatanja:**

- Provajder može da kreira/izmeni/obriše uslugu
- Usluge su povezane sa biznisom
- Validacija cene i trajanja radi
- Slike usluga mogu da se upload-uju

---

## Issue 3: Upravljanje zaposlenima

**Labels:** backend, frontend, enhancement, database

**Opis:**

Provajder treba da može da upravlja zaposlenima koji obavljaju usluge.

**Funkcionalnosti:**

- Dodavanje/izmena/brisanje zaposlenih
- Povezivanje zaposlenih sa korisnikom (opciono)
- Dodela usluga zaposlenima
- Podešavanje radnog vremena zaposlenih
- Kalendar dostupnosti zaposlenih

**Taskovi:**

- [ ] Kreirati Employee model (Sequelize)
- [ ] Kreirati EmployeeServices junction tabelu
- [ ] Napraviti Employee CRUD API
- [ ] Napraviti frontend ekran za zaposlene
- [ ] Napraviti UI za dodelu usluga zaposlenima
- [ ] Dodati konfiguraciju radnog vremena

**Kriterijumi prihvatanja:**

- Provajder može da doda zaposlene u biznis
- Zaposlenima mogu da se dodele usluge
- Radno vreme može da se podešava po zaposlenom

---

## Issue 4: Sistem zakazivanja termina - osnovna funkcionalnost

**Labels:** backend, frontend, enhancement, high-priority

**Opis:**

Implementirati glavni tok zakazivanja termina za klijente.

**Funkcionalnosti:**

- Pregled slobodnih termina
- Zakazivanje termina (usluga + zaposleni + vreme)
- Pregled budućih termina
- Otkazivanje/pomeranje termina
- Status termina (pending, confirmed, completed, cancelled)
- Potvrde preko email/SMS

**Taskovi:**

- [ ] Kreirati Appointment model (Sequelize)
- [ ] Kreirati BlockedTimeSlots model
- [ ] Implementirati logiku računanja dostupnih termina
- [ ] Napraviti Booking API endpoint-e
- [ ] Napraviti frontend tok zakazivanja
- [ ] Integrisati kalendar
- [ ] Dodati potvrde i notifikacije
- [ ] Ažurirati Swagger dokumentaciju

**Kriterijumi prihvatanja:**

- Klijent može da zakaže slobodan termin
- Sprečeno duplo zakazivanje
- Termin se vidi u poslovnom kalendaru
- Notifikacije se šalju na zakazivanje/otkazivanje

---

## Issue 5: Kalendar termina

**Labels:** frontend, enhancement

**Opis:**

Implementirati kalendarski prikaz za provajdere i klijente.

**Funkcionalnosti:**

- Provider kalendar: svi termini i raspored zaposlenih
- Client kalendar: samo lični termini
- Day/Week/Month prikazi
- Drag-and-drop pomeranje termina (samo provider)
- Boje po statusu termina
- Filter po zaposlenom/usluzi

**Taskovi:**

- [ ] Izabrati kalendar biblioteku (FullCalendar, Angular Calendar)
- [ ] Napraviti provider calendar komponentu
- [ ] Napraviti client calendar komponentu
- [ ] Dodati calendar API endpoint-e
- [ ] Dodati real-time osvežavanje (opciono)
- [ ] Dodati print/export kalendara

**Kriterijumi prihvatanja:**

- Provajder vidi sve poslovne termine
- Klijent vidi samo svoje termine
- Kalendar je responzivan i interaktivan

---

## Issue 6: Email notifikacije

**Labels:** backend, enhancement

**Opis:**

Implementirati email notifikacije za ključne događaje u aplikaciji.

**Tipovi email-a:**

- Registracija: welcome + verifikacija email-a
- Zakazan termin: potvrda klijentu i provajderu
- Podsetnik za termin: 24h pre termina
- Otkazan termin: obaveštenje obema stranama
- Reset lozinke: link za reset

**Taskovi:**

- [ ] Izabrati email servis (SendGrid, Mailgun, NodeMailer)
- [ ] Napraviti HTML email templejte
- [ ] Implementirati email servis
- [ ] Dodati queue sistem za slanje email-ova
- [ ] Završiti email verification flow
- [ ] Dodati scheduler za podsetnike
- [ ] Dodati podešavanja email preferenci

**Kriterijumi prihvatanja:**

- Svi transakcioni email-ovi se šalju
- Templejti su brendirani
- Email verifikacija radi end-to-end

---

## Issue 7: Pretraga i filteri za biznise/usluge

**Labels:** backend, frontend, enhancement

**Opis:**

Implementirati naprednu pretragu i filtere za pronalaženje biznisa i usluga.

**Pretraga po:**

- Nazivu biznisa
- Nazivu/kategoriji usluge
- Lokaciji (grad, adresa)
- Ključnim rečima

**Filteri:**

- Kategorija usluge
- Cenovni rang
- Ocena
- Udaljenost (geolokacija)
- Dostupnost (datum/vreme)

**Sortiranje:** relevantnost, cena, ocena, udaljenost

**Taskovi:**

- [ ] Napraviti Search API endpoint sa filterima
- [ ] Dodati indekse u bazi radi performansi
- [ ] Napraviti frontend search komponentu
- [ ] Napraviti filter sidebar/modal
- [ ] Dodati autocomplete/suggestions
- [ ] Dodati paginaciju rezultata
- [ ] Integrisati geolokaciju

**Kriterijumi prihvatanja:**

- Klijent može da pretražuje biznise/usluge
- Filteri rade brzo i tačno
- Rezultati su relevantni i pravilno sortirani

---

## Issue 8: Recenzije i ocene

**Labels:** backend, frontend, enhancement, database

**Opis:**

Omogućiti klijentima da ostavljaju recenzije i ocene nakon termina.

**Funkcionalnosti:**

- Sistem ocenjivanja sa 5 zvezdica
- Tekstualna recenzija (opciono)
- Prosečna ocena na profilu biznisa
- Sortiranje/filter recenzija
- Odgovor provajdera na recenziju

**Taskovi:**

- [ ] Kreirati Review model (Sequelize)
- [ ] Napraviti Review API endpoint-e (create/read/update/delete)
- [ ] Implementirati računanje prosečne ocene
- [ ] Napraviti frontend formu za recenzije
- [ ] Napraviti komponentu prikaza recenzija
- [ ] Validirati da samo završeni termini mogu da se ocenjuju
- [ ] Sprečiti više recenzija za isti termin

**Kriterijumi prihvatanja:**

- Klijenti mogu da ocenjuju samo završene termine
- Prosečna ocena se tačno računa
- Recenzije su vidljive na profilu biznisa

---

## Issue 9: Omiljeni biznisi (Favorites)

**Labels:** backend, frontend, enhancement, database

**Opis:**

Omogućiti klijentima da sačuvaju omiljene biznise za brži pristup.

**Funkcionalnosti:**

- Dodavanje/uklanjanje biznisa iz omiljenih
- Prikaz svih omiljenih biznisa
- Brzo zakazivanje iz omiljenih

**Taskovi:**

- [ ] Kreirati Favorites model/tabelu (user-business)
- [ ] Napraviti Favorites API endpoint-e
- [ ] Dodati favorite dugme/ikonu na frontend-u
- [ ] Napraviti Favorites stranicu/listu
- [ ] Dodati indikator statusa omiljenog

**Kriterijumi prihvatanja:**

- Klijent može da dodaje/uklanja omiljene biznise
- Omiljeni ostaju sačuvani između sesija
- Lista omiljenih se pravilno prikazuje

---

## Issue 10: Provider dashboard i analitika

**Labels:** frontend, backend, enhancement

**Opis:**

Napraviti dashboard za provajdere sa ključnim poslovnim metrikama.

**Metrike:**

- Ukupan broj termina (danas, nedelja, mesec)
- Prihod (procena na osnovu termina)
- Najtraženije usluge
- Najaktivniji zaposleni
- Odnos statusa termina
- Stopa otkazivanja
- Trend zakazivanja (grafici)

**Taskovi:**

- [ ] Napraviti analytics API endpoint-e
- [ ] Dodati agregacione upite nad bazom
- [ ] Napraviti dashboard komponentu
- [ ] Integrisati biblioteku za grafikone (Chart.js, ApexCharts)
- [ ] Dodati filter po vremenskom periodu
- [ ] Dodati export izveštaja (PDF/CSV)

**Kriterijumi prihvatanja:**

- Dashboard prikazuje ključne metrike
- Grafici su interaktivni i responzivni
- Podaci mogu da se filtriraju po periodu

---

## Issue 11: Upload slika (galerija biznisa i slike usluga)

**Labels:** backend, frontend, enhancement, database

**Opis:**

Implementirati upload i upravljanje slikama za biznise i usluge.

**Funkcionalnosti:**

- Upload slika biznisa (galerija)
- Upload slika usluga
- Višestruki upload
- Podešavanje glavne slike
- Skladištenje slika (lokalno ili cloud)

**Taskovi:**

- [ ] Izabrati storage rešenje (AWS S3, Cloudinary, lokalno)
- [ ] Dodati Multer middleware za upload
- [ ] Dodati obradu slika (Sharp)
- [ ] Kreirati BusinessImages model
- [ ] Napraviti API endpoint-e za upload slika
- [ ] Napraviti frontend upload komponentu
- [ ] Napraviti gallery komponentu
- [ ] Dodati validaciju veličine i tipa fajla

**Kriterijumi prihvatanja:**

- Biznisi mogu da dodaju više slika
- Slike su optimizovane
- Galerija se pravilno prikazuje

---

## NAKON KREIRANJA SVIH ISSUES

1. Idi na: https://github.com/users/zikaa37-gmail/projects/1
2. Klikni Add items
3. Izaberi sve nove Issues
4. Prevuci ih u odgovarajuću kolonu (Backlog, To Do, In Progress)
