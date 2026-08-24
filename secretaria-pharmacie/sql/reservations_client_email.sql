-- À exécuter dans Supabase SQL Editor
alter table reservations add column if not exists client_email text;
