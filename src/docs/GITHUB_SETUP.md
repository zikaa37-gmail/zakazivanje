# GitHub Project Setup - Korak po Korak

## 🎯 Pregled

GitHub Projects je odličan alat za task management jer je integrisan sa GitHub repoom i potpuno besplatan.

---

## 📋 Setup Koraci

### 1. Kreiranje GitHub Project-a

1. **Idi na svoj repo**: https://github.com/zikaa37-gmail/zakazivanje
2. Klikni na tab **"Projects"**
3. Klikni **"New project"**
4. Odaberi **"Team backlog"** ili **"Board"** template
5. Daj ime: `Zakazivanje - Development Board`
6. Klikni **"Create"**

### 2. Konfigurisanje Board-a

#### Kolone (Columns)

Preporučena struktura:

```
📥 Backlog        - Ideje i budući taskovi
📋 To Do          - Spremno za rad
🟡 In Progress    - Trenutno u izradi
👀 In Review      - Čeka code review
✅ Done           - Završeno
```

**Kako dodati/promeniti kolone**:

1. U Project board-u, klikni na `+ Add column`
2. Unesi naziv i opis
3. Drag and drop da promeniš redosled

#### Automatizacija

Podesi automaciju:

1. Klikni na `...` na koloni
2. Odaberi **"Manage automation"**
3. Omogući:
   - **To Do**: kada se assignuje Issue
   - **In Progress**: kada se kreira PR
   - **Done**: kada se merge-uje PR ili zatvori Issue

---

## 🏷️ Labels (Oznake)

### Kreiranje Labels

1. Idi na: https://github.com/zikaa37-gmail/zakazivanje/labels
2. Klikni **"New label"**

### Preporučene Labels

#### Po Tipu

- 🐛 `bug` - Nešto ne radi kako treba (crvena - #d73a4a)
- ✨ `enhancement` - Nova funkcionalnost (plava - #a2eeef)
- 📝 `documentation` - Dokumentacija (svetlo plava - #0075ca)
- 🔧 `task` - Generalni zadatak (zelena - #0e8a16)
- 🚀 `feature` - Novi feature (ljubičasta - #7057ff)
- 🔥 `hotfix` - Hitna ispravka (narandžasta - #ff6b35)

#### Po Oblasti

- 🎨 `frontend` - Angular kod
- ⚙️ `backend` - Node.js kod
- 💾 `database` - MySQL/Sequelize
- 🔐 `auth` - Autentifikacija
- 🧪 `testing` - Testovi

#### Po Prioritetu

- 🔴 `priority: high` - Visok prioritet (crvena - #b60205)
- 🟡 `priority: medium` - Srednji prioritet (žuta - #fbca04)
- 🟢 `priority: low` - Nizak prioritet (zelena - #0e8a16)

#### Dodatne

- ❓ `question` - Pitanje ili diskusija
- 🎓 `good first issue` - Dobro za početnike
- 🚧 `work in progress` - U toku
- 🔄 `duplicate` - Duplikat
- ❌ `wontfix` - Neće biti implementirano

---

## 📝 Issue Templates

### Kreiranje Templates

1. Kreiraj folder: `.github/ISSUE_TEMPLATE/`
2. Dodaj fajlove za različite tipove issues

### 1. Feature Request Template

**Fajl**: `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Feature Request
about: Predlog za novu funkcionalnost
title: '[FEATURE] '
labels: 'feature, enhancement'
assignees: ''
---

## 📋 Opis Feature-a

<!-- Jasno opiši šta želiš da implementiraš -->

## 👤 User Story

Kao [tip korisnika], želim [akcija], da bih [cilj/benefit].

**Primer**:
Kao klijent, želim da filtriram pružaoce usluga po oceni, da bih našao najbolje ocenjene salone.

## ✅ Acceptance Criteria

<!-- Šта mora da bude urađeno da bi feature bio kompletan? -->

- [ ] Kriterijum 1
- [ ] Kriterijum 2
- [ ] Kriterijum 3

## 🔧 Technical Notes

<!-- Tehnički detalji, API endpoints, komponente, servisi... -->

### Frontend

- Komponenta:
- Service:
- Models:

### Backend

- Endpoint:
- Controller:
- Model:

## 📊 Priority

- [ ] High
- [ ] Medium
- [ ] Low

## 📎 Additional Context

<!-- Screenshots, mockups, reference links... -->
```

### 2. Bug Report Template

**Fajl**: `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug Report
about: Prijavi bug ili grešku
title: '[BUG] '
labels: 'bug'
assignees: ''
---

## 🐛 Opis Bug-a

<!-- Kratak i jasan opis problema -->

## 🔄 Kako Reprodukovati

Koraci za reprodukciju problema:

1. Idi na '...'
2. Klikni na '...'
3. Scroll do '...'
4. Vidi grešku

## ✅ Očekivano Ponašanje

<!-- Šta bi trebalo da se desi? -->

## ❌ Stvarno Ponašanje

<!-- Šta se zapravo dešava? -->

## 📸 Screenshots

<!-- Ako je moguće, dodaj screenshot -->

## 🖥️ Environment

- **OS**: [Windows 10/11, macOS, Linux]
- **Browser**: [Chrome 120, Firefox 121, Safari 17]
- **Version**: [npr. v1.0.0]
- **Device**: [Desktop, Mobile, Tablet]

## 📝 Additional Context

<!-- Bilo šta dodatno što može pomoći -->

## 🔍 Possible Solution

<!-- Ako imaš ideju kako to popraviti -->
```

### 3. Task Template

**Fajl**: `.github/ISSUE_TEMPLATE/task.md`

```markdown
---
name: Task
about: Generalni task ili TODO
title: '[TASK] '
labels: 'task'
assignees: ''
---

## 📋 Task Description

<!-- Šta treba uraditi? -->

## ✅ Checklist

- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

## 🔗 Related Issues

<!-- Linkuj related issues ako ih ima -->

## 📊 Priority

- [ ] High
- [ ] Medium
- [ ] Low

## ⏱️ Estimated Time

<!-- Koliko vremena misliš da će trebati? -->
```

---

## 🏃 Workflow

### Kreiranje Novog Taska

1. **Kreiraj Issue**
   - Idi na **Issues** tab
   - Klikni **"New issue"**
   - Odaberi template (Feature/Bug/Task)
   - Popuni formu
   - Dodaj labels
   - Assignuj sebi (ili nekom drugom)
   - Klikni **"Submit new issue"**

2. **Dodaj u Project**
   - Na desnoj strani, klikni **"Projects"**
   - Odaberi svoj project
   - Issue će se pojaviti u **"Backlog"** koloni

3. **Započni rad**
   - Premesti issue u **"To Do"** kolonu
   - Kreiraj branch: `git checkout -b feature/issue-123`

4. **Tokom razvoja**
   - Premesti u **"In Progress"**
   - Commituj sa referencom: `git commit -m "feat: implement login form #123"`

5. **Code Review**
   - Kreiraj Pull Request
   - Linkuj Issue: "Closes #123" u PR description
   - Premesti u **"In Review"**

6. **Merge**
   - Merge PR
   - Issue će automatski biti zatvoren i premešten u **"Done"**

---

## 🎨 Milestones (Opciono)

Milestones grupišu issues po većim celinama (npr. verzije ili sprint-ovi).

### Kreiranje Milestone

1. Idi na: https://github.com/zikaa37-gmail/zakazivanje/milestones
2. Klikni **"New milestone"**
3. Unesi:
   - **Title**: npr. "MVP v1.0", "Sprint 1: Auth"
   - **Due date**: Deadline
   - **Description**: Šta obuhvata

### Primer Milestones

```
📌 MVP v1.0 - Auth & Basic Booking
   Due: May 15, 2026
   - 15 issues (8 closed, 7 open)

📌 v1.1 - Reviews & Ratings
   Due: June 30, 2026
   - 10 issues (2 closed, 8 open)

📌 v2.0 - Mobile App
   Due: August 30, 2026
   - 25 issues (0 closed, 25 open)
```

---

## 📊 GitHub Projects Views

### Board View

Klasičan Kanban board - najčešće korišćen.

### Table View

Svi issues u tabeli - dobar za filtering i sortiranje.

### Roadmap View (Timeline)

Gantt chart stil - dobar za planiranje sa deadlines.

**Kako switchovati**: U Project-u, klikni na `View` i odaberi tip.

---

## 🔔 Notifications

### Kako podesi notifications

1. Idi na: https://github.com/settings/notifications
2. Podesi:
   - **Email notifications**: Želim email notifikacije
   - **Participating**: Kada neko taguje ili assignuje
   - **Watching**: Kada se desi nešto na repo-u

### Best Practice

- Uključi notifikacije samo za issues koje si **assigned**
- Ignoriši notifikacije za sve repo-e osim važnih

---

## 💡 Pro Tips

### 1. Quick Issue Creation

U bilo kojem file-u, napravi komentar:

```typescript
// TODO: Implementirati forgot password #123
```

GitHub će automatski linkovati na Issue #123.

### 2. Cross-Reference Issues

U Issue description ili komentaru:

```
Related to #45
Blocks #67
Depends on #23
```

### 3. Keyboard Shortcuts

- `C` - Kreiraj novi issue
- `G` + `I` - Idi na Issues
- `G` + `P` - Idi na Pull Requests
- `/` - Search

### 4. Saved Filters

Kreiraj saved filter npr. "My open issues":

```
is:issue is:open assignee:zikaa37-gmail
```

### 5. Auto-close sa Commit

U commit message:

```
git commit -m "fix: resolve login bug

Fixes #123"
```

Issue #123 će biti automatski zatvoren kada se merge-uje.

---

## 📚 Reference Links

- [GitHub Issues Documentation](https://docs.github.com/en/issues)
- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)
- [Milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones)

---

## 🎯 Sledeći Korak

1. ✅ Kreiraj GitHub Project
2. ✅ Dodaj kolone (Backlog, To Do, In Progress, In Review, Done)
3. ✅ Kreiraj labels
4. ✅ Dodaj issue templates (`.github/ISSUE_TEMPLATE/`)
5. ✅ Kreiraj prvi Milestone: "MVP v1.0"
6. ✅ Kreiraj prve issues iz TASKS.md
7. ✅ Započni razvoj! 🚀

---

**Autor**: Zakazivanje Dev Team  
**Datum**: April 7, 2026
