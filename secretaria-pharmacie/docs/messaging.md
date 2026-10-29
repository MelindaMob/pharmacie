# Messages clients (SMS Brevo / WhatsApp)

Point d'entrée unique : `envoyerMessage()` dans `src/lib/messaging/envoyerMessage.ts`.
WhatsApp est prioritaire si `WHATSAPP_ENABLED=true` et qu'un template est fourni ; sinon SMS Brevo.

## Variables d'environnement

Voir `.env.example` :

- `BREVO_API_KEY` / `BREVO_SMS_SENDER`
- `WHATSAPP_ENABLED=false` (laisser false jusqu'à validation Meta)
- `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_TOKEN`
- `N8N_WEBHOOK_SECRET`

## Migration

Exécuter `sql/migration-brevo-messages.sql` dans le SQL Editor Supabase.

## Rappels n8n (H-2)

`POST /api/messages/envoyer`

Header : `x-webhook-secret: <N8N_WEBHOOK_SECRET>`

```json
{ "reservation_id": "<uuid>", "type": "rappel" }
```

Réponse : `{ "ok": true, "canal": "sms" }`. Met `reservations.rappel_envoye = true` si l'envoi réussit.

Le même chemin sans ce body reste le chat client (token + contenu).
