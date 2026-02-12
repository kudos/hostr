import path from 'path';
import views from 'co-views';
import Stripe from 'stripe';
import sendgrid from '@sendgrid/mail';

import models from '../../models/index.js';

const render = views(path.join(import.meta.dirname, '/../views'), { default: 'ejs' });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sendgrid.setApiKey(process.env.SENDGRID_KEY);

const from = process.env.EMAIL_FROM;
const fromname = process.env.EMAIL_NAME;

export async function create(ctx) {
  const { stripeToken } = ctx.request.body;

  const ip = ctx.request.headers['x-forwarded-for'] || ctx.req.connection.remoteAddress;

  const customer = await stripe.customers.create({
    source: stripeToken.id,
    email: ctx.user.email,
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: 'usd_monthly' }],
  });

  ctx.assert(subscription.status === 'active', 400, '{"status": "error"}');

  const user = await models.user.findByPk(ctx.user.id);
  user.plan = 'Pro';
  await user.save();

  const transaction = await models.transaction.create({
    userId: ctx.user.id,
    amount: subscription.plan.amount,
    description: subscription.plan.name,
    data: { ...customer, subscription },
    type: 'direct',
    ip,
  });

  await transaction.save();

  ctx.user.plan = 'Pro';
  ctx.body = { status: 'active' };

  const html = await render('email/inlined/pro');
  const text = `Hey, thanks for upgrading to Hostr Pro!

  You've signed up for Hostr Pro Monthly at $6/Month.

  — Jonathan Cremin, Hostr Founder
  `;

  sendgrid.send({
    to: ctx.user.email,
    subject: 'Hostr Pro',
    from,
    fromname,
    html,
    text,
    categories: [
      'pro-upgrade',
    ],
  });
}

export async function cancel(ctx) {
  const user = await models.user.findByPk(ctx.user.id);
  const transactions = await user.getTransactions();
  const transaction = transactions[0];

  await stripe.subscriptions.cancel(transaction.data.subscription.id);

  user.plan = 'Free';
  await user.save();

  ctx.user.plan = 'Free';
  ctx.body = { status: 'inactive' };
}
