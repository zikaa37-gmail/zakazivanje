# Git radni tok

Task tracking je na GitHub Issues (repo `zikaa37-gmail/zakazivanje`). Za svaki zadatak:

1. Povuci najnoviji `main` (`git checkout main && git pull`).
2. Napravi granu `feat-<broj taska>` (npr. `feat-17`) od `main`.
3. Promeni status taska: dodaj GitHub label `in progress` (`gh issue edit <br> --add-label "in progress"`).
4. Radi na tasku na toj grani.
5. Kad je gotovo, otvori pull request ka `main` (naslov i opis na srpskom; `Closes #<broj>` u opisu
   da se issue automatski zatvori pri merge-u).
6. Upiši na srpskom u komentar na tasku (ili PR-u) šta je urađeno — za UI izmene priloži i
   screenshot.
7. Posle merge-a: ukloni `in progress` label.

Deploy nije deo ovog toka — radi se samo kad se eksplicitno zatraži (`docs/DEPLOY.md`).

## Zabrana direktnog push-a na main

Isto kao `kosarkaska-evidencija`: zabrana je lokalna, preko git hook-a. Jednom pokreni (iz korena
repoa):

```bash
git config core.hooksPath .githooks
```

Posle toga je `git push origin main` odbijen sa porukom da se napravi grana i otvori PR.
