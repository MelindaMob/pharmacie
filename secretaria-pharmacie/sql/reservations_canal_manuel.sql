-- Migrations requises pour la création manuelle de RDV (dashboard pharmacie)
-- À exécuter dans Supabase SQL Editor

-- Email client sur la réservation
alter table reservations add column if not exists client_email text;

-- Autoriser le canal « manuel » (création depuis le dashboard pharmacie)
alter table reservations drop constraint if exists reservations_canal_check;
alter table reservations add constraint reservations_canal_check
  check (canal in ('vocal', 'web', 'manuel'));
