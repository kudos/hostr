import path from 'path';
import views from 'co-views';
const render = views(path.join(__dirname, '/../views'), { default: 'ejs'});
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { Mandrill } from 'mandrill-api/mandrill';
const mandrill = new Mandrill(process.env.MANDRILL_KEY);

const fromEmail = process.env.EMAIL_FROM;
const fromName = process.env.EMAIL_NAME;

export function* create() {
  const Users = this.db.Users;
  const Transactions = this.db.Transactions;
  const stripeToken = this.request.body.stripeToken;

  const createCustomer = {
    card: stripeToken.id,
    plan: 'usd_monthly',
    email: this.session.email,
  };

  const customer = yield stripe.customers.create(createCustomer);

  this.assert(customer.subscription.status === 'active', 400, '{"status": "error"}');

  delete customer.subscriptions;

  yield Users.updateOne({_id: this.session.user.id}, {'$set': {'stripe_customer': customer, type: 'Pro'}});

  const transaction = {
    'user_id': this.session.user.id,
    amount: customer.subscription.plan.amount,
    desc: customer.subscription.plan.name,
    date: new Date(customer.subscription.plan.created * 1000),
  };

  yield Transactions.insertOne(transaction);

  this.session.user.plan = 'Pro';
  this.body = {status: 'active'};

  const html = yield render('email/inlined/pro');
  const text = `Hey, thanks for upgrading to Hostr Pro!

  You've signed up for Hostr Pro Monthly at $6/Month.

  — Jonathan Cremin, Hostr Founder
  `;

  mandrill.messages.send({message: {
    html: html,
    text: text,
    subject: 'Hostr Pro',
    'from_email': fromEmail,
    'from_name': fromName,
    to: [{
      email: this.session.user.email,
      type: 'to',
    }],
    'tags': [
      'pro-upgrade',
    ],
  }});
}

export function* cancel() {
  this.assertCSRF();
  const Users = this.db.Users;
  const user = yield Users.findOne({_id: this.session.user.id});

  const confirmation = yield stripe.customers.cancelSubscription(
    user.stripe_customer.id,
    user.stripe_customer.subscription.id,
    { 'at_period_end': true }
  );

  yield Users.updateOne({_id: this.session.user.id}, {'$set': {'stripe_customer.subscription': confirmation, type: 'Free'}});

  this.session.user.plan = 'Pro';
  this.body = {status: 'inactive'};
}
