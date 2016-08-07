import path from 'path';
import views from 'co-views';
const render = views(path.join(__dirname, '/../views'), { default: 'ejs' });
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import sendgridInit from 'sendgrid';
const sendgrid = sendgridInit(process.env.SENDGRID_KEY);

import models from '../../models';

const from = process.env.EMAIL_FROM;
const fromname = process.env.EMAIL_NAME;

export function* create() {
  const stripeToken = this.request.body.stripeToken;

  const ip = this.request.headers['x-forwarded-for'] || this.req.connection.remoteAddress;

  const createCustomer = {
    card: stripeToken.id,
    plan: 'usd_monthly',
    email: this.user.email,
  };

  const customer = yield stripe.customers.create(createCustomer);

  this.assert(customer.subscription.status === 'active', 400, '{"status": "error"}');

  delete customer.subscriptions;

  const user = yield models.user.findById(this.user.id);
  user.plan = 'Pro';
  yield user.save();

  const transaction = yield models.transaction.create({
    userId: this.user.id,
    amount: customer.subscription.plan.amount,
    description: customer.subscription.plan.name,
    data: customer,
    type: 'direct',
    ip,
  });

  yield transaction.save();

  this.user.plan = 'Pro';
  this.body = { status: 'active' };

  const html = yield render('email/inlined/pro');
  const text = `Hey, thanks for upgrading to Hostr Pro!

  You've signed up for Hostr Pro Monthly at $6/Month.

  — Jonathan Cremin, Hostr Founder
  `;

  const mail = new sendgrid.Email({
    to: this.user.email,
    subject: 'Hostr Pro',
    from,
    fromname,
    html,
    text,
  });
  mail.addCategory('pro-upgrade');
  sendgrid.send(mail);
}

export function* cancel() {
  const user = yield models.user.findById(this.user.id);
  const transactions = yield user.getTransactions();
  const transaction = transactions[0];

  yield stripe.customers.cancelSubscription(
    transaction.data.id,
    transaction.data.subscription.id,
    { at_period_end: false }
  );

  user.plan = 'Free';
  yield user.save();

  this.user.plan = 'Free';
  this.body = { status: 'inactive' };
}
