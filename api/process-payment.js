const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentMethodId, amount, planType, email } = req.body;

  if (!paymentMethodId || !amount || !planType) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  try {
    if (planType === 'once') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        description: 'OfferFit - Single Analysis'
      });

      return res.status(200).json({
        success: true,
        paymentId: paymentIntent.id
      });
    } else if (planType === 'monthly') {
      const customer = await stripe.customers.create({
        email: email || 'customer@offerfit.app',
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'OfferFit Monthly - Unlimited Analyses' },
            recurring: { interval: 'month' },
            unit_amount: amount
          }
        }],
        payment_settings: { save_default_payment_method: 'on_subscription' }
      });

      return res.status(200).json({
        success: true,
        subscriptionId: subscription.id
      });
    }
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({
      error: 'Payment failed',
      details: error.message
    });
  }
};
