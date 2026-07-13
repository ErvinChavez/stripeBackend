const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// This is the pattern you'll reuse directly in Chavez Tree:
// customer approves a quote -> you create a Checkout Session for that
// specific amount -> redirect them to Stripe's hosted page -> webhook
// confirms payment and you mark the job as paid.
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment", // one-time, not recurring
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ONE_TIME,
          quantity: 1,
        },
      ],
      success_url: `${process.env.DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;