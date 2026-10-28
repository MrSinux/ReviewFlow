# Supabase Edge Functions

## `send-feedback-reply`

Lets a business admin (or the super admin) email a reply to a customer who left private feedback.

1. Reads the caller's Supabase JWT (from the `Authorization` header, or from `token` in the body so the
   browser can send a CORS "simple request" without a preflight).
2. Verifies the user with the service-role client and loads their `user_profiles` row.
   Only `admin` and `super` may send, and an `admin` may only reply to feedback for their own business.
3. Sends the email through the [Resend](https://resend.com) API, quoting the original feedback.
4. Logs the reply in `public.feedback_replies` and stamps `feedback.last_reply_at` / `last_reply_to`.

### Environment

| Variable | Source |
| --- | --- |
| `SUPABASE_URL` | Injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected by Supabase |
| `RESEND_API_KEY` | Secret you set (see `.env.example`) |
| `RESEND_FROM_EMAIL` | Secret you set, must be a verified Resend sender |

### Deploy

```bash
supabase secrets set RESEND_API_KEY=re_... RESEND_FROM_EMAIL="Your Business <replies@example.com>"
supabase functions deploy send-feedback-reply
```

### Run locally

```bash
cp supabase/functions/.env.example supabase/functions/.env   # then fill it in
supabase functions serve send-feedback-reply --env-file supabase/functions/.env
```
