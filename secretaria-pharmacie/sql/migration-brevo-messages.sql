-- SMS Brevo + journal des envois. À exécuter dans le SQL Editor Supabase.

create table if not exists public.message_envois (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid null,
  type text not null check (type in ('confirmation','rappel','manquant','autre')),
  canal text not null check (canal in ('whatsapp','sms')),
  telephone text not null,
  provider_message_id text null,
  statut text not null default 'envoye',
  erreur text null,
  created_at timestamptz not null default now()
);
create index if not exists message_envois_reservation_idx on public.message_envois(reservation_id);
create index if not exists message_envois_provider_idx on public.message_envois(provider_message_id);

alter table public.message_envois
  drop constraint if exists message_envois_reservation_fk;
alter table public.message_envois
  add constraint message_envois_reservation_fk
  foreign key (reservation_id) references public.reservations(id) on delete set null;

create table if not exists public.contacts_canal (
  telephone text primary key,
  canal_prefere text check (canal_prefere in ('whatsapp','sms')),
  updated_at timestamptz not null default now()
);

alter table public.reservations
  add column if not exists rappel_envoye boolean not null default false;

alter table public.message_envois enable row level security;
alter table public.contacts_canal enable row level security;
-- Accès uniquement via service_role (pas de policy publique).
