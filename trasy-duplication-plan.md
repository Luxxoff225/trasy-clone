# Plan de duplication Trasy → Logiciel web propriétaire (usage interne agence transit)
**Stack : Next.js 14 (App Router) + Supabase + Tailwind CSS + Vercel**
**Mode : logiciel interne propriétaire — un seul compte/agence, pas de multi-tenancy**
**Mode d'envoi unique : Express 5-7 jours (pas de groupage)**
**Date : 2 mai 2026**

---

## PHASE 1 — Cartographie complète du produit

### 1.1 Vue d'ensemble

**Description**
Logiciel web interne pour gérer les colis Express (5-7 jours) de Chine vers la Côte d'Ivoire (ou autre destination). Un seul tableau de bord centralisé pour : enregistrer chaque colis reçu, déclencher automatiquement les notifications WhatsApp/SMS au client à chaque changement de statut, et suivre en temps réel les kg disponibles. Remplace ton fichier Excel + WhatsApp manuel.

**Problème résolu**
Aujourd'hui : colis sur Excel, notifs WhatsApp envoyées à la main, oublis fréquents, pas de visibilité sur les kg restants, clients qui appellent pour savoir où en est leur colis. Demain : tout centralisé, notifs automatiques, dashboard temps réel.

**Utilisateurs cibles**
- **Toi (admin)** : configuration, vision globale, KPIs
- **Tes agents** : enregistrement colis, changement de statut
- **Lecteur** : consultation seule (ex : compta)
- **Clients finaux** : reçoivent les WhatsApp/SMS + page de tracking publique

**Modèle de données core**

| Entité | Description | Relations |
|---|---|---|
| `profiles` | Utilisateurs internes (admin/agent/viewer) | — |
| `customers` | Clients de l'agence | 1-N → packages |
| `packages` | Colis individuels enregistrés | N-1 → customer, N-1 → route |
| `routes` | Routes Chine → CI (avec capacité kg max) | 1-N → packages |
| `package_status_history` | Historique horodaté des changements de statut | N-1 → package |
| `notifications` | Log des messages WhatsApp/SMS envoyés | N-1 → package |
| `message_templates` | Templates de messages avec variables | — |
| `audit_log` | Trace des modifications/suppressions | — |

> Pas de table `agencies` (mono-tenant), pas de table `shipments` (pas de groupage).

---

### 1.2 Inventaire des fonctionnalités (validé par toi)

#### Module 1 — Authentification & utilisateurs
- **CORE** : Login email/password, logout, session persistante
- **CORE** : Création de comptes utilisateurs internes (admin)
- **IMPORTANT** : Rôles (admin / agent / lecteur)
- **IMPORTANT** : Reset password via email

#### Module 2 — Gestion clients
- **CORE** : Créer / lire / modifier / archiver un client
- **CORE** : Champs : nom, prénom, téléphone (avec indicatif pays), WhatsApp préféré (oui/non), email, adresse destination, ville, pays
- **IMPORTANT** : Recherche / filtre / tri (par nom, téléphone, date)
- **IMPORTANT** : Détection des doublons (numéro de téléphone)
- **IMPORTANT** : Vue fiche client = liste de tous ses colis + historique

#### Module 3 — Enregistrement de colis
- **CORE** : Formulaire avec :
  - Sélection client existant ou création à la volée
  - Description du contenu (nature)
  - Poids (kg) — input numérique
  - Nombre de pièces/cartons
  - Volume optionnel (cm³ ou L × l × h)
  - Route / destination
  - Numéro de tracking auto-généré (`TRS-2026-00042`)
  - Photos optionnelles (1-3 photos)
  - Mode de paiement (cash, mobile money, à l'arrivée)
  - Montant payé / reste à payer
- **CORE** : À la sauvegarde → statut initial = `Reçu`
- **CORE** : Génération PDF reçu/étiquette imprimable
- **IMPORTANT** : Édition / suppression (avec audit log)

#### Module 4 — Capacité & poids (pas de groupage)
- **CORE** : Calcul automatique du poids total et kg disponibles restants
  - Logique : capacité totale (configurable par route, ex : 1000 kg) − somme des poids des colis actifs (statuts `Reçu` + `En transit`) = kg disponibles
  - Reset / nouveau cycle quand un lot part (ou via bouton manuel "Vidage")

#### Module 5 — Workflow de statuts
- **CORE** : Statuts officiels :
  - `Reçu` (réception en Chine)
  - `En transit`
  - `Disponible` (arrivé, prêt à être retiré)
  - `Livré / récupéré` (clôturé)
  - `Litige` (cas d'exception)
- **CORE** : Changement de statut manuel depuis la fiche colis
- **CORE** : Historique horodaté des changements (qui, quand, depuis → vers)
- **CORE** : Trigger auto d'une notification client à chaque changement

#### Module 6 — Notifications WhatsApp / SMS
- **CORE** : Envoi auto à la création du colis (confirmation `Reçu`)
- **CORE** : Envoi auto à chaque changement de statut
- **CORE** : Fallback : WhatsApp d'abord, SMS si WhatsApp impossible
- **CORE** : Templates personnalisables avec variables :
  - `{nom}`, `{tracking}`, `{poids}`, `{statut}`, `{montant_a_payer}`, `{nature_colis}`
- **IMPORTANT** : Log des notifs envoyées (succès/échec)
- **IMPORTANT** : Renvoi manuel depuis la fiche colis
- **NICE** : Multi-langues (FR, EN), pièces jointes (photo du colis)

#### Module 7 — Tableau de bord
- **CORE** : Carte "kg disponibles aujourd'hui" (capacité − utilisé)
- **CORE** : Carte "kg enregistrés aujourd'hui"
- **CORE** : Carte "kg enregistrés à date X" (sélecteur de date)
- **CORE** : Compteurs par statut (Reçus, En transit, Disponibles, Livrés, Litige)
- **IMPORTANT** : Graphique des enregistrements quotidiens (7/30 jours)
- **NICE** : Top clients du mois, CA encaissé, carte des destinations

#### Module 8 — Liste / recherche colis
- **CORE** : Tableau paginé de tous les colis
- **CORE** : Filtres : statut, client, route, plage de dates
- **CORE** : Recherche par numéro de tracking
- **IMPORTANT** : Tri par colonne, export CSV/Excel
- **NICE** : Vue Kanban par statut

#### Module 9 — Page de tracking publique
- **IMPORTANT** : Page publique `tondomaine.com/track/TRS-2026-00042` (sans login)
- **IMPORTANT** : Affiche statut courant, timeline des étapes, ETA, photos
- **NICE** : Lien direct dans le SMS/WhatsApp

---

### 1.3 Analyse des flux utilisateur

**Onboarding (premier setup, fait une fois par toi)**
1. Création du compte admin → 2. Création des routes (ex : Chine → Abidjan, capacité 1000 kg) → 3. Configuration des templates WhatsApp/SMS → 4. Connexion provider (Twilio) → 5. Création des comptes agents → 6. Premier colis test

**Happy path quotidien**
1. Colis reçu en Chine → agent ouvre l'app → "Nouveau colis"
2. Cherche le client (ou le crée à la volée) → saisit poids, contenu, route, paiement → submit
3. Système : génère `TRS-2026-XXXXX`, baisse les kg dispo, envoie WhatsApp "Reçu" au client
4. Imprime l'étiquette/reçu PDF
5. Quand le lot part : agent passe les colis en `En transit` → notif auto "votre colis a quitté la Chine"
6. À l'arrivée à Abidjan : status `Disponible` → notif "votre colis est prêt à être retiré, montant à payer : X"
7. Le client vient → status `Livré` → notif de clôture / remerciement

**Points de friction à anticiper**
- Numéros de téléphone mal formatés → imposer format E.164 (`+225...`)
- Coût des notifs WhatsApp/SMS (compteur à prévoir)
- Connexion internet instable au comptoir → optimistic UI + PWA installable
- Doublons clients quand 2 agents enregistrent le même client

---

### 1.4 Intégrations et dépendances

**APIs tierces**
- **WhatsApp** : WhatsApp Business Cloud API (Meta) ou Twilio WhatsApp
- **SMS** : Africa's Talking (top pour la CI), Orange SMS API ou Twilio
- **Email transactionnel** (reset password) : Resend ou Supabase Auth natif
- **Auth** : Supabase Auth
- **Stockage photos** : Supabase Storage
- **PDF** : `@react-pdf/renderer` ou `react-to-print`
- **QR code** : `qrcode` npm

**Webhooks**
- Webhook entrant WhatsApp pour récupérer le statut delivered/read
- Webhook Twilio pour les statuts SMS

**Imports/exports**
- Export CSV/Excel des colis par période
- Import CSV clients (initialisation depuis ton ancien Excel)
- Génération PDF étiquette + reçu

---

## PHASE 2 — Analyse technique

### 2.1 Architecture recommandée

#### Schéma Supabase (PostgreSQL) — version mono-tenant simplifiée

```sql
-- ============ PROFILES (lié à auth.users) ============
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  role text check (role in ('admin','agent','viewer')) default 'agent',
  active boolean default true,
  created_at timestamptz default now()
);

-- ============ ROUTES ============
create table routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- "Chine → Abidjan Express"
  origin text not null,
  destination text not null,
  capacity_kg numeric(10,2) default 1000,
  price_per_kg numeric(10,2),
  currency text default 'XOF',
  estimated_days int default 7,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============ CUSTOMERS ============
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,        -- format E.164 +225...
  whatsapp_enabled boolean default true,
  email text,
  address text,
  city text,
  country text default 'Côte d''Ivoire',
  notes text,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_customers_phone on customers(phone);
create index idx_customers_full_name on customers(full_name);

-- ============ PACKAGES ============
create table packages (
  id uuid primary key default gen_random_uuid(),
  tracking_number text unique not null,    -- TRS-2026-00042
  customer_id uuid references customers(id) not null,
  route_id uuid references routes(id),
  description text,                        -- nature du colis
  weight_kg numeric(10,2) not null,
  pieces int default 1,
  volume_cm3 numeric(12,2),
  declared_value numeric(12,2),
  amount_paid numeric(12,2) default 0,
  amount_due numeric(12,2) default 0,
  payment_method text check (payment_method in ('cash','mobile_money','on_delivery')),
  status text check (status in ('received','in_transit','available','delivered','dispute')) default 'received',
  photos jsonb default '[]'::jsonb,        -- urls Supabase Storage
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_packages_status on packages(status);
create index idx_packages_customer on packages(customer_id);
create index idx_packages_route on packages(route_id);
create index idx_packages_created_at on packages(created_at);
create index idx_packages_tracking on packages(tracking_number);

-- ============ STATUS HISTORY ============
create table package_status_history (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references packages(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz default now()
);

-- ============ NOTIFICATIONS ============
create table notifications (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references packages(id) on delete cascade,
  customer_id uuid references customers(id),
  channel text check (channel in ('whatsapp','sms','email')) not null,
  template_key text,                       -- 'package_received', etc.
  recipient text not null,
  message text not null,
  status text check (status in ('queued','sent','delivered','read','failed')) default 'queued',
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz default now()
);
create index idx_notif_package on notifications(package_id);
create index idx_notif_status on notifications(status);

-- ============ MESSAGE TEMPLATES ============
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,                       -- 'package_received'
  channel text not null,                   -- 'whatsapp' | 'sms'
  language text default 'fr',
  body text not null,                      -- avec {variables}
  active boolean default true,
  unique(key, channel, language)
);

-- ============ AUDIT LOG ============
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,                    -- 'package.update', 'package.delete', etc.
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz default now()
);

-- ============ RLS (sécurité simple : tout user authentifié accède) ============
alter table profiles enable row level security;
alter table customers enable row level security;
alter table packages enable row level security;
alter table routes enable row level security;
alter table notifications enable row level security;
alter table message_templates enable row level security;
alter table package_status_history enable row level security;
alter table audit_log enable row level security;

-- Policy : tout user authentifié lit
create policy "auth_read_customers" on customers for select using (auth.uid() is not null);
create policy "auth_read_packages" on packages for select using (auth.uid() is not null);
-- (idem pour les autres)

-- Policy : agents et admins peuvent insert/update
create policy "agent_write_customers" on customers
  for all using (
    auth.uid() is not null
    and (select role from profiles where id = auth.uid()) in ('admin','agent')
  );

-- Policy : seul admin peut delete et gérer les profiles
create policy "admin_delete_packages" on packages
  for delete using ((select role from profiles where id = auth.uid()) = 'admin');

-- ============ TRIGGERS ============
-- Auto-générer tracking_number
create sequence if not exists tracking_seq start 1;

create or replace function generate_tracking_number()
returns trigger as $$
begin
  if new.tracking_number is null then
    new.tracking_number := 'TRS-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('tracking_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_tracking before insert on packages
  for each row execute function generate_tracking_number();

-- Logger les changements de statut
create or replace function log_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into package_status_history(package_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_status_log after update on packages
  for each row execute function log_status_change();

-- Vue : kg disponibles par route
create or replace view route_capacity as
select
  r.id as route_id,
  r.name,
  r.capacity_kg,
  coalesce(sum(p.weight_kg) filter (where p.status in ('received','in_transit')), 0) as used_kg,
  r.capacity_kg - coalesce(sum(p.weight_kg) filter (where p.status in ('received','in_transit')), 0) as available_kg
from routes r
left join packages p on p.route_id = r.id
where r.active = true
group by r.id, r.name, r.capacity_kg;
```

#### Architecture frontend (Next.js 14 App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── reset-password/page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx                # KPIs
│   ├── packages/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── customers/{page,new/page,[id]/page}.tsx
│   ├── routes/page.tsx
│   ├── notifications/page.tsx  # log
│   └── settings/
│       ├── page.tsx
│       ├── templates/page.tsx
│       └── users/page.tsx
└── track/
    └── [tracking]/page.tsx     # public
```

#### Architecture backend / API

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/packages` | POST | Créer un colis (déclenche notif) |
| `/api/packages/[id]` | PATCH/DELETE | Modifier/supprimer (audit log) |
| `/api/packages/[id]/status` | PATCH | Changer statut (déclenche notif) |
| `/api/packages/[id]/notify` | POST | Renvoi manuel notif |
| `/api/notifications/send` | POST | Envoi notif (interne) |
| `/api/webhooks/whatsapp` | POST | Réception status WhatsApp |
| `/api/webhooks/twilio` | POST | Réception status SMS |
| `/api/dashboard/stats` | GET | KPIs |

**Auth** : Supabase Auth + middleware Next.js qui redirige vers `/login` si pas de session.

---

### 2.2 Roadmap en sprints (1 semaine = 30-35h)

#### **Sprint 1 — MVP fonctionnel (CORE)** — *30h*
| Tâche | Heures |
|---|---|
| Init Next.js + Tailwind + shadcn/ui + Supabase + Vercel | 2h |
| Schéma DB + RLS + triggers + view kg dispo | 4h |
| Auth (login, middleware, layout protégé) | 3h |
| CRUD Customers (liste, création, fiche, archive) | 4h |
| Formulaire création colis + génération tracking | 5h |
| Liste colis avec filtres statut + recherche | 4h |
| Fiche colis + changement statut manuel | 3h |
| Service notifications WhatsApp/SMS avec fallback | 3h |
| Templates messages + envoi auto à création/changement | 2h |

**Livrable Sprint 1** : tu peux enregistrer un colis, le client reçoit WhatsApp, tu changes le statut, le client reçoit la mise à jour.

#### **Sprint 2 — Dashboard + capacité + PDF (CORE/IMPORTANT)** — *25h*
| Tâche | Heures |
|---|---|
| Dashboard : kg dispo, kg du jour, sélecteur date, compteurs | 4h |
| Graphique 7/30 jours (recharts) | 3h |
| CRUD Routes avec capacité | 3h |
| Génération PDF reçu/étiquette + QR code | 5h |
| Édition / suppression colis + audit log | 4h |
| Photos colis (upload Supabase Storage) | 4h |
| Fiche client avec tous ses colis | 2h |

#### **Sprint 3 — Public + polish (IMPORTANT)** — *25h*
| Tâche | Heures |
|---|---|
| Page tracking publique `/track/[code]` | 5h |
| Log notifications + renvoi manuel | 3h |
| Templates personnalisables UI | 4h |
| Export CSV/Excel | 3h |
| Gestion rôles (admin/agent/viewer) | 3h |
| Reset password | 2h |
| Webhooks statuts WhatsApp/Twilio | 4h |
| Mobile responsive + PWA | 1h |

#### **Sprint 4+ — NICE-TO-HAVE**
- Vue Kanban par statut
- Multi-langues FR/EN
- Top clients / CA mensuel
- Carte des destinations
- Import CSV clients

---

### 2.3 Complexité et risques

**Points complexes**
1. **Validation WhatsApp Business API** : 1-3 semaines côté Meta. Solution rapide : Twilio WhatsApp (instantané mais plus cher).
2. **Calcul kg dispo en temps réel** : utiliser la vue Postgres `route_capacity` (déjà prévue dans le schéma).
3. **PDF côté serveur** : alternative simple = page imprimable HTML stylée + `window.print()`.
4. **Format E.164 strict** : `libphonenumber-js` à la saisie.

**Dépendances critiques (npm)**
```
@supabase/supabase-js, @supabase/ssr
react-hook-form, zod (validation)
libphonenumber-js
date-fns
recharts (graphes)
@react-pdf/renderer ou react-to-print
qrcode
sonner (toasts)
lucide-react (icônes)
twilio (notifications)
```

**Services tiers**
- Supabase (DB + Auth + Storage) — free tier OK au démarrage
- Vercel (hosting) — free tier
- Twilio (WhatsApp + SMS unique provider au début)
- Africa's Talking (SMS Afrique, optionnel)

---

## PHASE 3 — Plan d'action Claude Code

### 3.1 Structure de dossiers complète

```
trasy-clone/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── packages/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── customers/{page,new/page,[id]/page}.tsx
│   │   ├── routes/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── settings/{page,templates/page,users/page}.tsx
│   ├── track/[tracking]/page.tsx
│   ├── api/
│   │   ├── packages/route.ts
│   │   ├── packages/[id]/route.ts
│   │   ├── packages/[id]/status/route.ts
│   │   ├── packages/[id]/notify/route.ts
│   │   ├── notifications/send/route.ts
│   │   ├── webhooks/whatsapp/route.ts
│   │   └── webhooks/twilio/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/ (shadcn)
│   ├── packages/{PackageForm,PackageTable,StatusBadge,StatusChanger,PhotoUpload}.tsx
│   ├── customers/{CustomerForm,CustomerSearch}.tsx
│   ├── routes/{RouteForm,CapacityBar}.tsx
│   ├── dashboard/{KpiCard,WeightChart,DateSelector,StatusCounters}.tsx
│   └── layout/{Sidebar,Header}.tsx
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── notifications/{whatsapp,sms,send}.ts
│   ├── pdf/{label,receipt}.tsx
│   ├── phone.ts
│   ├── tracking.ts
│   ├── audit.ts
│   └── utils.ts
├── types/
│   ├── database.ts (généré)
│   └── index.ts
├── supabase/
│   ├── migrations/0001_init.sql
│   ├── migrations/0002_seed_templates.sql
│   └── seed.sql
├── middleware.ts
├── .env.local.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 3.2 Ordre de développement optimal

1. **Setup & infra** : Next.js + Tailwind + shadcn + Supabase + env
2. **Schéma DB** : exécuter migrations SQL → générer types TS
3. **Auth + middleware** : login fonctionnel
4. **Layout protégé + sidebar** : squelette navigation
5. **CRUD Routes** (config simple, sans dépendance) — bon échauffement
6. **CRUD Customers** : entité simple
7. **Service notifications mocké** (log console d'abord)
8. **CRUD Packages** : dépend de Customers + Routes, déclenche notifs
9. **Dashboard v1** : queries → KPI cards
10. **Connecter le vrai WhatsApp/SMS Twilio**
11. **PDF, photos, exports**
12. **Page tracking publique** (indépendante, en parallèle si besoin)

---

### 3.3 Prompts Claude Code prêts à l'emploi (Sprint 1)

#### **Prompt 1 — Setup du projet**
```
Initialise un projet Next.js 14 avec App Router, TypeScript strict, Tailwind CSS et ESLint dans le dossier courant.

Étapes :
1. `npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*"`
2. Installe les dépendances : @supabase/supabase-js @supabase/ssr react-hook-form zod @hookform/resolvers libphonenumber-js date-fns recharts qrcode sonner lucide-react clsx tailwind-merge twilio
3. Initialise shadcn/ui : `npx shadcn@latest init` avec base color = neutral, et installe les composants : button input label dialog table form select card badge toast tabs dropdown-menu textarea switch avatar separator
4. Crée un fichier `.env.local.example` avec : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_SMS_FROM, AFRICASTALKING_API_KEY (optionnel), AFRICASTALKING_USERNAME (optionnel)
5. Crée la structure de dossiers : app/(auth), app/(dashboard), app/api, components/ui, components/layout, lib/supabase, lib/notifications, lib/pdf, types, supabase/migrations
6. Crée lib/utils.ts avec la fonction `cn` (clsx + tailwind-merge)
7. Crée un README.md court qui résume comment lancer le projet (variables env, npm run dev, migrations Supabase)
8. Configure tailwind.config.ts pour inclure le chemin des composants shadcn

C'est un logiciel web propriétaire MONO-UTILISATEUR (mono-tenant), pas un SaaS. Donc pas de notion d'agence/organisation à intégrer.

Confirme la structure finale en listant l'arborescence créée.
```

#### **Prompt 2 — Schéma de base de données Supabase**
```
Crée le fichier `supabase/migrations/0001_init.sql` avec le schéma complet de la BDD pour un logiciel interne de gestion de colis Express (mono-tenant, pas de notion d'agence).

Tables à créer :

- profiles (lié à auth.users) : id uuid PK references auth.users, email unique, full_name, role enum('admin','agent','viewer') default 'agent', active bool default true, created_at
- routes : id uuid PK, name (ex "Chine → Abidjan Express"), origin, destination, capacity_kg numeric default 1000, price_per_kg, currency default 'XOF', estimated_days int default 7, active bool default true, created_at
- customers : id uuid PK, full_name, phone unique (format E.164), whatsapp_enabled bool default true, email, address, city, country default 'Côte d''Ivoire', notes, archived bool default false, created_at, updated_at
- packages : id uuid PK, tracking_number text unique, customer_id FK customers, route_id FK routes, description (= nature du colis), weight_kg numeric, pieces int default 1, volume_cm3, declared_value, amount_paid default 0, amount_due default 0, payment_method enum('cash','mobile_money','on_delivery'), status enum('received','in_transit','available','delivered','dispute') default 'received', photos jsonb default '[]', created_by FK profiles, created_at, updated_at
- package_status_history : id, package_id FK packages cascade, from_status, to_status, changed_by FK profiles, note, created_at
- notifications : id, package_id FK packages cascade, customer_id FK customers, channel enum('whatsapp','sms','email'), template_key, recipient, message, status enum('queued','sent','delivered','read','failed') default 'queued', provider_message_id, error, sent_at, created_at
- message_templates : id, key, channel, language default 'fr', body, active bool default true, unique(key, channel, language)
- audit_log : id, user_id FK profiles, action, entity_type, entity_id uuid, before jsonb, after jsonb, created_at

Ajoute :
1. Une séquence `tracking_seq` et un trigger `before insert on packages` qui auto-génère `tracking_number` au format `TRS-YYYY-00001` quand il est null.
2. Un trigger `after update on packages` qui insère dans package_status_history quand status change (avec auth.uid() comme changed_by).
3. Une vue `route_capacity` qui calcule pour chaque route active : capacity_kg, used_kg (somme weight_kg des colis en statuts 'received' ou 'in_transit' sur cette route), available_kg.
4. Active RLS sur toutes les tables. Policies :
   - SELECT : tout user authentifié (auth.uid() is not null)
   - INSERT/UPDATE : users avec role 'admin' ou 'agent' (sub-query sur profiles)
   - DELETE : uniquement role 'admin'
5. Index sur : packages(status), packages(customer_id), packages(route_id), packages(created_at), packages(tracking_number), customers(phone), customers(full_name), notifications(package_id), notifications(status).

Crée aussi `supabase/migrations/0002_seed_templates.sql` qui insère 5 templates par défaut en français pour les clés `package_received`, `package_in_transit`, `package_available`, `package_delivered`, `package_dispute` sur les canaux whatsapp ET sms, en utilisant les variables {nom}, {tracking}, {poids}, {statut}, {montant_a_payer}, {nature_colis}.

Exemple de body pour package_available (whatsapp) :
"Bonjour {nom}, votre colis {tracking} ({nature_colis}, {poids}kg) est arrivé et prêt à être retiré. Montant à payer : {montant_a_payer}. Merci !"

Documente comment exécuter ces migrations via la CLI Supabase ou le SQL Editor.
```

#### **Prompt 3 — Auth Supabase + middleware + layout protégé**
```
Implémente l'authentification Supabase pour un logiciel interne (un seul espace de travail, pas de multi-tenancy).

1. Crée `lib/supabase/client.ts` (createBrowserClient) et `lib/supabase/server.ts` (createServerClient avec cookies()).
2. Crée `middleware.ts` à la racine qui :
   - Utilise @supabase/ssr pour rafraîchir la session sur chaque requête
   - Si non-authentifié et accès à /(dashboard) → redirect /login
   - Si authentifié et accès à /login → redirect /
   - Exclut les routes /track/* (publiques) et /api/webhooks/*
3. Crée `app/(auth)/login/page.tsx` : formulaire email/password avec react-hook-form + zod, toast erreur via sonner, redirect vers / au succès. Composants shadcn (Card, Input, Label, Button).
4. Crée `app/(dashboard)/layout.tsx` :
   - Server component qui récupère le user via supabase.auth.getUser(), redirect /login si null
   - Récupère aussi le profile (role) du user
   - Layout : sidebar gauche fixe (240px) + zone de contenu
5. Crée `components/layout/Sidebar.tsx` : logo en haut, liens vers Dashboard, Colis, Clients, Routes, Notifications, Paramètres (avec lucide-react icons : LayoutDashboard, Package, Users, Map, Bell, Settings). Highlight du lien actif.
6. Crée `components/layout/Header.tsx` (client component) avec dropdown user (nom + email + bouton logout).
7. Crée `app/api/auth/logout/route.ts` (POST) qui fait signOut et redirect /login.
8. Ajoute un "lecture seule" pour role='viewer' : dans Sidebar, cache les boutons d'action.

Teste : créer un user dans Supabase Auth + insérer un row dans profiles avec role='admin', login → dashboard, logout → login. Confirme que ça marche.
```

#### **Prompt 4 — CRUD Customers complet**
```
Implémente le module Clients complet (liste, création, édition, fiche, archive, recherche).

1. Crée `lib/phone.ts` qui exporte :
   - `formatToE164(input: string, defaultCountry='CI'): string | null`
   - `isValidPhone(input: string): boolean`
   - `formatForDisplay(e164: string): string`
   - Utilise libphonenumber-js

2. Crée `types/index.ts` avec les types Customer, Package, Route, Profile (matchant la DB).

3. Crée `app/(dashboard)/customers/page.tsx` (server component) :
   - Récupère tous les customers non archivés via supabase server client (orderBy created_at desc)
   - Affiche un tableau (composant shadcn Table) : Nom, Téléphone, Ville, Date création, Actions (voir, archiver)
   - Bouton "Nouveau client" → /customers/new
   - Champ recherche (côté client, filtre instantané sur full_name + phone)
   - Filtre tri (par nom A-Z, par date)

4. Crée `components/customers/CustomerForm.tsx` (client component) avec react-hook-form + zod :
   - Champs : full_name (required, min 2 chars), phone (required + select indicatif pays + validation E.164), whatsapp_enabled (Switch, default true), email (optionnel format email), address, city, country (default 'Côte d''Ivoire'), notes (textarea)
   - Mode `create` ou `edit` (props customer? optionnel)
   - À la submit : insert/update via supabase client, toast succès, router.push('/customers')
   - Détection doublons : avant insert, query customers where phone = newPhone. Si existe → toast warning + lien vers le client existant.

5. Crée `app/(dashboard)/customers/new/page.tsx` qui rend `<CustomerForm mode="create" />`.

6. Crée `app/(dashboard)/customers/[id]/page.tsx` (server component) :
   - Fetch le customer par id + tous ses packages (joinés avec route, ordonnés desc)
   - Affiche fiche client (info, badge whatsapp/sms) + tableau de tous ses colis avec statut
   - Bouton "Modifier" qui ouvre le formulaire en mode edit (Dialog shadcn)
   - Bouton "Archiver" qui set archived=true (avec confirmation)

7. Si le user est role='viewer', cache les boutons "Modifier", "Archiver", "Nouveau client".

Teste toute la chaîne : créer 2 clients (un avec WhatsApp, un sans), tenter un doublon, en éditer un, archiver, vérifier que le tableau est à jour.
```

#### **Prompt 5 — Création de colis avec notification automatique**
```
Implémente le formulaire de création de colis avec déclenchement automatique d'une notification WhatsApp/SMS.

C'est le cœur du logiciel.

1. Crée `lib/notifications/whatsapp.ts` :
   - Export `sendWhatsApp(to: string, message: string): Promise<{ id: string, success: boolean, error?: string }>`
   - En dev (TWILIO_ACCOUNT_SID absent), log en console et retourne success=true avec un id 'mock-xxx'
   - En prod : utilise twilio SDK pour envoyer via WhatsApp (from = `whatsapp:${TWILIO_WHATSAPP_FROM}`, to = `whatsapp:${to}`)

2. Crée `lib/notifications/sms.ts` :
   - Export `sendSMS(to: string, message: string)` via Twilio SMS (from = TWILIO_SMS_FROM)
   - Mêmes contrats de retour
   - En dev : log console + mock

3. Crée `lib/notifications/send.ts` :
   - Export `sendPackageNotification({ packageId, templateKey })` :
     - Récupère le package + customer + route depuis Supabase (server client avec service role)
     - Récupère le template (key + channel + language='fr')
     - Remplace les variables : {nom} = customer.full_name, {tracking} = package.tracking_number, {poids} = package.weight_kg, {statut} = mappage français du status, {montant_a_payer} = package.amount_due + ' ' + route.currency, {nature_colis} = package.description
     - Si customer.whatsapp_enabled → tente WhatsApp d'abord. Si échec → fallback SMS.
     - Sinon → SMS direct.
     - Insère dans notifications avec result (status, provider_message_id, error si échec)
   - Doit être appelable depuis API routes ET server actions

4. Crée `lib/audit.ts` : export `logAudit({ userId, action, entityType, entityId, before, after })` qui insert dans audit_log.

5. Crée `app/api/packages/route.ts` (POST) :
   - Auth check (server client)
   - Body validé par zod : customer_id (uuid), description, weight_kg (>0), pieces (default 1), volume_cm3 (optionnel), route_id (uuid), declared_value (optionnel), amount_paid (default 0), amount_due (default 0), payment_method ('cash'|'mobile_money'|'on_delivery')
   - Insert dans packages (status='received') → trigger DB génère tracking_number
   - Récupère le package créé (avec tracking_number) via .select().single()
   - Appelle `sendPackageNotification({ packageId: pkg.id, templateKey: 'package_received' })` en arrière-plan (don't await pour ne pas bloquer)
   - Retourne le package complet
   - Try/catch global avec log des erreurs

6. Crée `components/customers/CustomerSearch.tsx` (client component) :
   - Combobox avec input debounced (300ms) qui query supabase customers where full_name ilike OR phone ilike
   - Affiche dropdown avec full_name + phone
   - Dernier item : "+ Créer un nouveau client" qui ouvre une Dialog avec CustomerForm en mode quick-create
   - onSelect : remplit le form parent avec customer_id

7. Crée `components/packages/PackageForm.tsx` (client component) :
   - Champs (avec react-hook-form + zod) :
     - CustomerSearch (required)
     - Description / nature du colis (textarea, required)
     - Weight_kg (number, step 0.1, min 0.1, required)
     - Pieces (number, default 1)
     - Volume_cm3 (number, optionnel) OU 3 inputs L × l × h qui se calculent
     - Route (Select des routes actives) — affiche aussi à côté la capacité dispo via la vue route_capacity
     - Declared_value (number)
     - Amount_paid + amount_due (number)
     - Payment_method (Select : cash / mobile_money / à la livraison)
   - Si la route choisie a available_kg < weight_kg saisi → afficher un warning (mais ne pas bloquer)
   - Submit → POST /api/packages → toast "Colis enregistré : TRS-2026-XXXXX, notification envoyée à {nom}" → router.push(`/packages/${id}`)

8. Crée `app/(dashboard)/packages/new/page.tsx` qui rend `<PackageForm />`.

Teste : créer un colis avec un client existant → vérifier qu'une row notifications est insérée et (en dev) que le message s'affiche en console avec les variables remplacées correctement.
```

---

## PHASE 4 — Synthèse décisionnelle

### Estimation réaliste du temps total
- Sprint 1 (CORE) : **5-6 jours plein temps** (30h dev + 10h debug)
- Sprint 2 (dashboard, PDF, photos) : **4-5 jours**
- Sprint 3 (public, polish) : **4-5 jours**
- **MVP utilisable : 2 à 3 semaines plein temps** ou **5-6 semaines à 15h/semaine**.
- Démarche WhatsApp Business : 1-2 semaines en parallèle.

### MVP fonctionnel en 2 semaines — déprioriser
- ❌ Page tracking publique → plus tard
- ❌ PDF complexe → page imprimable HTML simple (`window.print()`)
- ❌ Photos colis → sprint 3
- ❌ Export CSV → sprint 3
- ❌ Templates UI configurables → templates en dur dans le code (modifiables via SQL)
- ❌ Webhooks de statut entrants → simple log "envoyé"
- ❌ Multi-langues → FR uniquement

**Garde absolument** : Auth, CRUD Customers, CRUD Packages, calcul kg dispo, dashboard 4 KPI, WhatsApp+SMS auto, changement de statut + notif, liste filtrée colis.

### Top 3 des risques

1. **Validation WhatsApp Business API (Meta)** — 1-3 semaines. **Mitigation** : démarrer la démarche immédiatement, utiliser Twilio WhatsApp comme fallback (instantané, plus cher), prévoir un plan B "SMS only".

2. **Coût des messages** — WhatsApp 0,01-0,07 €/message + SMS Afrique ~0,03-0,05 €. Pour 100 colis/jour × 4 notifs = 400 messages/jour ≈ 450 €/mois. **Mitigation** : compteur intégré, regrouper certaines notifs, SMS uniquement quand WhatsApp indispo.

3. **Concurrence sur les kg dispo** — 2 agents enregistrent en parallèle et dépassent la capacité. **Mitigation** : afficher la capacité en temps réel dans le formulaire, warning doux si dépassement (pas de blocage). La cohérence eventual est acceptable pour ton volume.

### Recommandation sur la stack

✅ **Next.js + Supabase + Tailwind + Vercel reste parfait pour un logiciel propriétaire mono-tenant.**

Avantages :
- Supabase Auth + DB + Storage = setup en quelques heures
- Next.js App Router : pages publiques (tracking) et privées (dashboard) dans le même projet
- Vercel : déploiement zéro config + free tier confortable pour un usage interne
- shadcn/ui : UI pro en 1 jour

**Ajouts recommandés** :
- shadcn/ui (essentiel)
- react-hook-form + zod (validation)
- **Twilio comme provider unique au démarrage** (WhatsApp + SMS via la même API). Switch vers Africa's Talking pour SMS plus tard si optimisation coût.

**Alternative à considérer** : si tu veux tout self-hosté (data en CI), remplace Vercel par un VPS Coolify et utilise `supabase self-hosted` via Docker. Mais pour démarrer, Vercel + Supabase Cloud reste idéal.

---

## Récap actionnable

**Cette semaine** :
1. Crée le projet Supabase Cloud (gratuit)
2. Crée le projet Vercel + repo GitHub
3. Demande la validation WhatsApp Business sur Meta Business Manager (en parallèle, démarche externe)
4. Lance le **Prompt 1** dans Claude Code → setup
5. Avance dans l'ordre : Prompt 2 (DB) → 3 (auth) → 4 (clients) → 5 (colis)

**Sources**
- [Trasy - Modern Parcel Tracking & Logistics Management](https://landing.trasy.io/en)
- [Trasy.io](https://trasy.io/)
