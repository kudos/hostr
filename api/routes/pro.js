import path from 'path';
import views from 'co-views';
import Stripe from 'stripe';
import sendgrid from '@sendgrid/mail';

import models from '../../models';

const render = views(path.join(__dirname, '/../views'), { default: 'ejs' });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sendgrid.setApiKey(process.env.SENDGRID_KEY);

const from = process.env.EMAIL_FROM;
const fromname = process.env.EMAIL_NAME;

export async function create(ctx) {
  const { stripeToken } = ctx.request.body;

  const ip = ctx.request.headers['x-forwarded-for'] || ctx.req.connection.remoteAddress;

  const createCustomer = {
    card: stripeToken.id,
    plan: 'usd_monthly',
    email: ctx.user.email,
  };

  const customer = await stripe.customers.create(createCustomer);

  ctx.assert(customer.subscription.status === 'active', 400, '{"status": "error"}');

  delete customer.subscriptions;

  const user = await models.user.findById(ctx.user.id);
  user.plan = 'Pro';
  await user.save();

  const transaction = await models.transaction.create({
    userId: ctx.user.id,
    amount: customer.subscription.plan.amount,
    description: customer.subscription.plan.name,
    data: customer,
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
  const user = await models.user.findById(ctx.user.id);
  const transactions = await user.getTransactions();
  const transaction = transactions[0];

  await stripe.customers.cancelSubscription(
    transaction.data.id,
    transaction.data.subscription.id,
    { at_period_end: false },
  );

  user.plan = 'Free';
  await user.save();

  ctx.user.plan = 'Free';
  ctx.body = { status: 'inactive' };
}
