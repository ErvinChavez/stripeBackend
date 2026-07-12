require("dotenv").config();
const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 4242;

// IMPORTANT: the webhook route needs the RAW request body to verify
// Stripe's signature, so it must be mounted BEFORE express.json() runs
// on that path. Everything else can use the normal JSON parser.
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/checkout"));
app.use("/", require("./routes/subscription"));
app.use("/", require("./routes/portal"));
app.use("/", require("./routes/webhook"));

// Simple endpoint the frontend polls to show "what does Stripe think
// this user's state is" — stands in for a real /me or /account endpoint.
app.get("/me", (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "email query param required" });
  res.json(db.getUser(email));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});