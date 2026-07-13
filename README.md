# Stripe Mini SaaS — Learning Project

A dummy project built to learn Stripe deeply enough to open doors across
dev, fintech, and SaaS roles — not just to patch one feature into Chavez
Tree Service Platform. It covers the concepts that actually show up in job
requirements: Checkout, PaymentIntents (under the hood of Checkout),
Subscriptions, the Customer Portal, and — the part most tutorials skip —
webhooks.

## What's in here

| File | Concept |
|---|---|
| `routes/checkout.js` | One-time payment via Checkout Session (`mode: "payment"`) — this is the slice you'll port to Chavez Tree for quote/deposit payments |
| `routes/subscription.js` | Recurring billing via Checkout Session (`mode: "subscription"`) — the SaaS-job-posting skill |
| `routes/portal.js` | Stripe's prebuilt Customer Portal — lets users self-manage billing with almost no code |
| `routes/webhook.js` | Verifies and reacts to Stripe events — the actual source of truth for "did this payment really happen" |
| `db.js` | Fake in-memory DB so you can see state change without needing Postgres/Mongo set up first |

## Setup

1. **Create a free Stripe account** at stripe.com — stay in **test mode** (toggle top-right of dashboard).

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Copy the env template and fill it in:**
   ```
   cp .env.example .env
   ```
   - `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY`: Dashboard → Developers → API keys
   - `STRIPE_PRICE_ONE_TIME`: Dashboard → Product catalog → add a product → one-time price → copy its `price_...` ID
   - `STRIPE_PRICE_SUBSCRIPTION`: same, but choose "recurring" (e.g. monthly) when creating the price
   - `STRIPE_WEBHOOK_SECRET`: you'll get this in step 5 below

4. **Install the Stripe CLI** (lets you test webhooks locally without deploying):
   - Mac: `brew install stripe/stripe-cli/stripe`
   - Or download from https://github.com/stripe/stripe-cli/releases
   - Then: `stripe login`

5. **Start the webhook listener** (separate terminal tab):
   ```
   stripe listen --forward-to localhost:4242/webhook
   ```
   This prints a `whsec_...` value — paste that into `STRIPE_WEBHOOK_SECRET` in your `.env`.

6. **Start the server:**
   ```
   npm start
   ```

7. **Open** http://localhost:4242, enter an email, and try:
   - "Buy Course" → use test card `4242 4242 4242 4242`, any future expiry, any CVC
   - "Join Membership" → same test card
   - "Open Billing Portal" (only works after you've subscribed once)
   - Watch the terminal running `stripe listen` — you'll see events arrive in real time
   - Watch the terminal running `npm start` — you'll see the `✅`/`❌` logs from `webhook.js`
   - Click "Refresh" on the page to see the in-memory state update

## Learning checkpoints (map back to the roadmap)

Once you can explain each of these out loud, you've got what most job
postings mean by "Stripe experience":

- [ ] Why webhooks exist and why `success_url` alone isn't enough to grant access
- [ ] Why the webhook route needs raw body parsing while everything else uses JSON
- [ ] The difference between Checkout Sessions and PaymentIntents/Elements, and when you'd choose one over the other
- [ ] What a subscription lifecycle looks like: `checkout.session.completed` → `invoice.paid` (renewals) → `invoice.payment_failed` → `customer.subscription.deleted`
- [ ] Why webhook signature verification matters (what happens if you skip it)

## Porting the relevant slice to Chavez Tree

When you're ready, only `checkout.js` + the `checkout.session.completed`
case in `webhook.js` (for `mode: "payment"`) need to move over. Swap:
- the "product" (course) for a quote/job total
- `db.grantCourseAccess(email)` for something like `markJobAsPaid(jobId)`
- the static price ID for a dynamically calculated line item (Stripe
  supports `price_data` inline instead of a pre-created Price object,
  which is what you'll actually want since every quote is a different
  amount)
