const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../db");

// This is the route most tutorials skip or fake — and the one that
// actually separates "I did a Stripe demo" from "I understand payments."
//
// Why webhooks matter: the browser redirect to success_url tells you the
// USER finished checkout, but it does NOT reliably tell you Stripe
// actually captured the money (e.g. bank transfers, delayed payment
// methods, or the user just closing the tab after paying). Webhooks are
// the source of truth — always grant access/update state here, not in
// the success_url handler.
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // req.body is the raw Buffer here because of express.raw() in server.js.
    // This verifies the payload really came from Stripe, not an attacker
    // hitting your endpoint directly.
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const email = session.customer_email || session.customer_details?.email;

      if (session.customer) {
        db.setStripeCustomerId(email, session.customer);
      }

      if (session.mode === "payment") {
        // One-time purchase completed — this is the Chavez Tree case:
        // mark the job/quote as paid.
        db.grantCourseAccess(email);
        console.log(`✅ One-time payment complete for ${email}`);
      } else if (session.mode === "subscription") {
        db.setSubscriptionStatus(email, "active");
        console.log(`✅ Subscription started for ${email}`);
      }
      break;
    }

    case "invoice.paid": {
      // Fires on the initial subscription invoice AND every renewal.
      const invoice = event.data.object;
      const user = db.findByCustomerId(invoice.customer);
      if (user) {
        db.setSubscriptionStatus(user.email, "active");
        console.log(`✅ Invoice paid, subscription active for ${user.email}`);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const user = db.findByCustomerId(invoice.customer);
      if (user) {
        db.setSubscriptionStatus(user.email, "past_due");
        console.log(`⚠️ Payment failed for ${user.email}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const user = db.findByCustomerId(subscription.customer);
      if (user) {
        db.setSubscriptionStatus(user.email, "canceled");
        console.log(`❌ Subscription canceled for ${user.email}`);
      }
      break;
    }

    default:
      // There are 250+ event types. In real apps you only handle the
      // handful that matter to your product — ignoring the rest is fine.
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Always respond 200 quickly. If you don't, Stripe will retry the
  // webhook repeatedly, assuming your server failed.
  res.json({ received: true });
});

module.exports = router;