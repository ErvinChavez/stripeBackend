const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../db");

// Stripe's prebuilt Customer Portal: a hosted page where users can update
// their card, view invoices, or cancel their subscription — with zero
// custom UI from you. Big value-for-effort win to show off in interviews.
router.post("/create-portal-session", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    const user = db.getUser(email);
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: "No Stripe customer found for this email yet. Subscribe first." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.DOMAIN}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;