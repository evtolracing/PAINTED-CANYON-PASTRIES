// Lazy-initialize Stripe so a missing key doesn't crash the whole app on load.
// Routes that call stripe methods will get a clear error at call-time rather than boot-time.
let _stripe = null;

const handler = {
  get(target, prop) {
    if (prop === '_initialized') return !!_stripe;
    if (!_stripe) {
      const key = (process.env.STRIPE_SECRET_KEY || '').trim();
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY is not configured. Add it to your Vercel environment variables.');
      }
      _stripe = require('stripe')(key);
    }
    const val = _stripe[prop];
    return typeof val === 'function' ? val.bind(_stripe) : val;
  },
};

module.exports = new Proxy({}, handler);
