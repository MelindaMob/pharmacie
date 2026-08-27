-- Numéro vocal Paul (Telnyx / Retell) sur les pharmacies
alter table pharmacies
  add column if not exists retell_phone_number text;
