-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (utilisateurs internes)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null default 'agent' check (role in ('admin', 'agent', 'viewer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CUSTOMERS (clients de l'agence)
create table customers (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  phone text not null unique,
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

-- ROUTES
create table routes (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  origin text not null,
  destination text not null,
  capacity_kg numeric not null default 1000,
  price_per_kg numeric not null default 8000,
  currency text not null default 'XOF',
  estimated_days integer not null default 7,
  active boolean default true,
  created_at timestamptz default now()
);

-- PACKAGES (colis)
create table packages (
  id uuid default uuid_generate_v4() primary key,
  tracking_number text unique,
  customer_id uuid references customers(id) not null,
  route_id uuid references routes(id) not null,
  description text not null,
  weight_kg numeric not null check (weight_kg > 0),
  pieces integer not null default 1,
  volume_cm3 numeric,
  declared_value numeric,
  amount_paid numeric default 0,
  amount_due numeric default 0,
  payment_method text default 'cash' check (payment_method in ('cash', 'mobile_money', 'on_delivery')),
  status text not null default 'received' check (status in ('received', 'in_transit', 'available', 'delivered', 'dispute')),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PACKAGE STATUS HISTORY
create table package_status_history (
  id uuid default uuid_generate_v4() primary key,
  package_id uuid references packages(id) on delete cascade not null,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table notifications (
  id uuid default uuid_generate_v4() primary key,
  package_id uuid references packages(id) on delete cascade not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  recipient_phone text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- MESSAGE TEMPLATES
create table message_templates (
  id uuid default uuid_generate_v4() primary key,
  key text not null,
  channel text not null check (channel in ('whatsapp', 'sms')),
  language text not null default 'fr',
  body text not null,
  active boolean default true,
  created_at timestamptz default now(),
  unique(key, channel, language)
);

-- AUDIT LOG
create table audit_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz default now()
);

-- FONCTION : génère le numéro de tracking
create or replace function generate_tracking_number()
returns trigger as $$
declare
  year_part text;
  seq_part text;
  new_tracking text;
begin
  year_part := to_char(now(), 'YYYY');
  select lpad(count(*)::text + 1, 5, '0')
  into seq_part
  from packages
  where extract(year from created_at) = extract(year from now());
  new_tracking := 'TRS-' || year_part || '-' || seq_part;
  new.tracking_number := new_tracking;
  return new;
end;
$$ language plpgsql;

-- TRIGGER : appelle la fonction avant insert
create trigger set_tracking_number
  before insert on packages
  for each row
  when (new.tracking_number is null)
  execute function generate_tracking_number();

-- FONCTION : log automatique des changements de statut
create or replace function log_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into package_status_history (package_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$ language plpgsql;

-- TRIGGER : log à chaque update de statut
create trigger on_status_change
  after update on packages
  for each row
  execute function log_status_change();

-- VUE : capacité disponible par route
create or replace view route_capacity as
select
  r.id,
  r.name,
  r.origin,
  r.destination,
  r.capacity_kg,
  r.currency,
  r.estimated_days,
  coalesce(sum(case when p.status in ('received', 'in_transit') then p.weight_kg else 0 end), 0) as used_kg,
  r.capacity_kg - coalesce(sum(case when p.status in ('received', 'in_transit') then p.weight_kg else 0 end), 0) as available_kg
from routes r
left join packages p on p.route_id = r.id
group by r.id, r.name, r.origin, r.destination, r.capacity_kg, r.currency, r.estimated_days;

-- RLS (Row Level Security)
alter table profiles enable row level security;
alter table customers enable row level security;
alter table packages enable row level security;
alter table routes enable row level security;
alter table package_status_history enable row level security;
alter table notifications enable row level security;
alter table message_templates enable row level security;
alter table audit_log enable row level security;

-- Policies : accès uniquement aux users authentifiés
create policy "Authenticated users can read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage customers" on customers for all using (auth.role() = 'authenticated');
create policy "Authenticated users can manage packages" on packages for all using (auth.role() = 'authenticated');
create policy "Authenticated users can read routes" on routes for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage routes" on routes for all using (auth.role() = 'authenticated');
create policy "Authenticated users can read history" on package_status_history for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read notifications" on notifications for select using (auth.role() = 'authenticated');
create policy "Service role can manage notifications" on notifications for all using (auth.role() = 'service_role');
create policy "Authenticated users can read templates" on message_templates for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read audit" on audit_log for select using (auth.role() = 'authenticated');
