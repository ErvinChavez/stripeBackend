// Fake "database" — just an in-memory object.
// In Chavez Tree, this logic would instead read/write Postgres.
// The point of this file is to isolate "what do I do when Stripe tells me
// something happened" from the storage layer, so swapping in a real DB
// later only means changing what's in these functions — not your routes.

const state = {
  // keyed by customer email for simplicity
  users: {},
};

function getUser(email) {
  if (!state.users[email]) {
    state.users[email] = {
      email,
      stripeCustomerId: null,
      hasCourseAccess: false, // set true on one-time purchase
      subscriptionStatus: null, // 'active' | 'canceled' | 'past_due' | null
    };
  }
  return state.users[email];
}

function setStripeCustomerId(email, customerId) {
  const user = getUser(email);
  user.stripeCustomerId = customerId;
  return user;
}

function grantCourseAccess(email) {
  const user = getUser(email);
  user.hasCourseAccess = true;
  return user;
}

function setSubscriptionStatus(email, status) {
  const user = getUser(email);
  user.subscriptionStatus = status;
  return user;
}

function findByCustomerId(customerId) {
  return Object.values(state.users).find((u) => u.stripeCustomerId === customerId);
}

function dump() {
  return state.users;
}

module.exports = {
  getUser,
  setStripeCustomerId,
  grantCourseAccess,
  setSubscriptionStatus,
  findByCustomerId,
  dump,
};