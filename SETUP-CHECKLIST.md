# Checklist de setup — Logiciel de gestion de colis
**Coche au fur et à mesure. Reporte les valeurs dans les zones `[À REMPLIR]`.**

---

## ÉTAPE 0 — Prérequis sur ta machine (5 min)

- [ ] **Node.js 20+** installé → vérifie avec `node -v`
  - Sinon : https://nodejs.org/ (LTS)
- [ ] **Git** installé → vérifie avec `git --version`
- [ ] **Compte GitHub** actif
- [ ] **VS Code** ou autre éditeur avec terminal intégré
- [ ] **Claude Code** installé → https://docs.claude.com/en/docs/claude-code

---

## ÉTAPE 1 — Supabase (10 min) ⏱️

🔗 https://supabase.com/dashboard

- [ ] Créer un compte (login Google ou GitHub)
- [ ] **New Project**
  - Name : `trasy-clone`
  - Database password : génère et **enregistre dans un gestionnaire de mots de passe**
  - Region : choisis la plus proche (Frankfurt `eu-central-1` recommandé pour CI)
  - Pricing plan : Free
- [ ] Attends 2 min que le projet soit provisionné
- [ ] Va dans **Settings → API** et copie ces valeurs :

```
Project URL : [À REMPLIR]
anon public key : [À REMPLIR]
service_role key : [À REMPLIR — SECRET, ne JAMAIS commit]
```

- [ ] Va dans **Settings → Database → Connection string** et note :

```
Connection string (URI) : [À REMPLIR]
```

- [ ] Installe la CLI Supabase localement :
  ```
  npm install -g supabase
  ```

---

## ÉTAPE 2 — GitHub (5 min) ⏱️

🔗 https://github.com/new

- [ ] Créer un repo **privé** nommé `trasy-clone`
- [ ] Ne pas initialiser avec README (Claude Code va le créer)
- [ ] Note l'URL du repo :

```
GitHub repo URL : [À REMPLIR]
```

- [ ] Sur ta machine, crée un dossier projet :
  ```
  mkdir trasy-clone
  cd trasy-clone
  git init
  git remote add origin [URL_DU_REPO]
  ```

---

## ÉTAPE 3 — Vercel (5 min) ⏱️

🔗 https://vercel.com/new

- [ ] Login avec GitHub
- [ ] **Add New → Project** → sélectionne le repo `trasy-clone`
- [ ] Pour l'instant ça va échouer (pas encore de code) — c'est normal, on déploiera après le Prompt 1
- [ ] Note le nom du projet Vercel :

```
Vercel project name : [À REMPLIR]
URL future : https://[À REMPLIR].vercel.app
```

---

## ÉTAPE 4 — Twilio (provider WhatsApp + SMS, 10 min) ⏱️

🔗 https://www.twilio.com/try-twilio

- [ ] Créer un compte Twilio (15 $ de crédit gratuit pour démarrer)
- [ ] Vérifie ton numéro de téléphone perso
- [ ] Dans le dashboard, récupère :

```
Account SID : [À REMPLIR]
Auth Token : [À REMPLIR]
```

- [ ] **WhatsApp Sandbox** (pour développer SANS attendre la validation Meta) :
  - Messaging → Try it out → Send a WhatsApp message
  - Suis les instructions pour activer le sandbox (envoie le code "join xxx" depuis ton WhatsApp)
  - Note le numéro sandbox :

```
TWILIO_WHATSAPP_FROM (sandbox) : whatsapp:+14155238886 (numéro public Twilio)
```

- [ ] **SMS** : achète un numéro Twilio (~1 $/mois, optionnel pour MVP)
  - Phone Numbers → Buy a number → choisis un numéro qui supporte SMS

```
TWILIO_SMS_FROM : [À REMPLIR — format +1234567890]
```

> 💡 En sandbox WhatsApp, seuls les numéros qui ont "rejoint" le sandbox recevront les messages. Parfait pour le dev.

---

## ÉTAPE 5 — WhatsApp Business officiel (en parallèle, 1-3 semaines) ⏱️

🔗 https://business.facebook.com/

**À démarrer MAINTENANT car c'est ce qui peut bloquer le plus longtemps.**

- [ ] Crée ou connecte-toi à Meta **Business Manager**
- [ ] **Settings → Business Info** : remplis toutes les infos de ton agence
- [ ] **Business Verification** : upload tes documents
  - Registre de commerce / RCCM
  - Justificatif d'adresse
  - Preuve de site web (peut être ton tracking page une fois en prod)
- [ ] **WhatsApp Manager** → ajoute un numéro de téléphone dédié au business
  - ⚠️ Ce numéro NE DOIT PAS être déjà utilisé sur l'app WhatsApp normale
  - Idéalement : carte SIM dédiée à l'agence
- [ ] Crée tes premiers templates de message (à approuver par Meta) :
  - `package_received`
  - `package_in_transit`
  - `package_available`
  - `package_delivered`

> 💡 Tu peux développer **toute l'app** avec Twilio WhatsApp Sandbox en attendant. Une fois Meta validé, tu basculeras juste les variables d'env.

---

## ÉTAPE 6 — Crée ton fichier .env.local (à utiliser après le Prompt 1) ⏱️

Garde ce template prêt à coller dans `.env.local` une fois le projet initialisé :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=[copie depuis étape 1]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[copie depuis étape 1]
SUPABASE_SERVICE_ROLE_KEY=[copie depuis étape 1]

# Twilio
TWILIO_ACCOUNT_SID=[copie depuis étape 4]
TWILIO_AUTH_TOKEN=[copie depuis étape 4]
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_SMS_FROM=[copie depuis étape 4 si tu as acheté un numéro]

# Africa's Talking (optionnel, pour SMS Afrique moins cher)
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=
```

---

## ÉTAPE 7 — Lance Claude Code (15 min) ⏱️

- [ ] Ouvre un terminal dans le dossier `trasy-clone`
- [ ] Lance Claude Code : `claude`
- [ ] Copie-colle le **Prompt 1** depuis `trasy-duplication-plan.md` (section 3.3)
- [ ] Attends que Claude Code termine l'init du projet
- [ ] Crée le fichier `.env.local` avec les valeurs de l'étape 6
- [ ] Lance `npm run dev` → vérifie que `http://localhost:3000` charge

---

## ÉTAPE 8 — Migrations Supabase (10 min) ⏱️

- [ ] Lance le **Prompt 2** dans Claude Code (création des migrations SQL)
- [ ] Une fois les fichiers `0001_init.sql` et `0002_seed_templates.sql` créés :

**Option A — via la CLI Supabase (recommandé)** :
```
supabase login
supabase link --project-ref [TON_PROJECT_REF]
supabase db push
```
*(Le project ref est dans l'URL de ton dashboard Supabase : `https://supabase.com/dashboard/project/XXXXX`)*

**Option B — via le SQL Editor Supabase** :
1. Va sur Supabase → SQL Editor
2. Colle le contenu de `0001_init.sql` → Run
3. Colle le contenu de `0002_seed_templates.sql` → Run

- [ ] Vérifie dans **Table Editor** que toutes les tables sont créées (profiles, customers, packages, routes, etc.)
- [ ] Va dans **Database → Functions** : vérifie que `generate_tracking_number` et `log_status_change` existent
- [ ] Va dans **Database → Views** : vérifie que `route_capacity` existe

---

## ÉTAPE 9 — Crée ton premier user admin (5 min) ⏱️

- [ ] Va dans Supabase → **Authentication → Users → Add user → Create new user**
- [ ] Email : ton email perso
- [ ] Password : choisis-en un fort
- [ ] Auto Confirm User : ✅ coché
- [ ] Note l'UUID du user créé :

```
Mon user UUID : [À REMPLIR]
Mon email login : [À REMPLIR]
```

- [ ] Insère le profile correspondant dans la table `profiles` (SQL Editor) :

```sql
insert into profiles (id, email, full_name, role)
values ('[TON_UUID]', '[TON_EMAIL]', 'Abdoulaye', 'admin');
```

- [ ] Insère ta première route :

```sql
insert into routes (name, origin, destination, capacity_kg, price_per_kg, currency, estimated_days)
values ('Chine → Abidjan Express', 'Guangzhou', 'Abidjan', 1000, 8000, 'XOF', 7);
```

---

## ÉTAPE 10 — Continuer le développement ⏱️

- [ ] Lance le **Prompt 3** (Auth + middleware + layout)
- [ ] Teste le login sur `localhost:3000/login`
- [ ] Lance le **Prompt 4** (CRUD Customers)
- [ ] Crée 2-3 clients de test
- [ ] Lance le **Prompt 5** (Création de colis + notif)
- [ ] Crée un colis test avec ton propre numéro → vérifie que tu reçois le WhatsApp ! 🎉

---

## ✅ Critères de validation Sprint 1

Tu sauras que ton MVP est fonctionnel quand :

- [ ] Tu peux te connecter avec ton compte admin
- [ ] Tu peux créer un client
- [ ] Tu peux créer un colis et tu reçois automatiquement le WhatsApp de confirmation
- [ ] Tu peux changer le statut du colis (Reçu → En transit → Disponible) et le client reçoit chaque notif
- [ ] Le dashboard affiche les kg du jour et les kg disponibles
- [ ] La liste des colis est filtrable par statut

---

## 🆘 Si tu bloques

| Problème | Solution |
|---|---|
| Erreur Supabase "Invalid API key" | Vérifie que tu as copié anon key (pas service role) côté client |
| WhatsApp Twilio Sandbox ne reçoit rien | Le destinataire doit avoir envoyé "join xxx" depuis son WhatsApp |
| Migrations SQL échouent | Lance-les une à une dans le SQL Editor pour identifier la ligne fautive |
| `npm run dev` plante | Supprime `node_modules` et `.next`, relance `npm install` |
| Claude Code ne fait pas ce que tu veux | Sois ultra précis, utilise les prompts du plan tels quels |

---

## 📋 Récap de tes valeurs (à remplir)

Garde cette section comme aide-mémoire personnel :

```
Projet Supabase URL : 
Mon project ref :
Mon email admin :
Mon UUID admin :
URL Vercel future :
Numéro WhatsApp business (en attente Meta) :
```
