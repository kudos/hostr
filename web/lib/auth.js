import passwords from 'passwords';
import uuid from 'node-uuid';
import views from 'co-views';
const render = views(__dirname + '/../views', { default: 'ejs'});
import { Mandrill } from 'mandrill-api/mandrill';
const mandrill = new Mandrill(process.env.MANDRILL_KEY);

export function* sendResetToken(email) {
  const Users = this.db.Users;
  const Reset = this.db.Reset;
  const user = yield Users.findOne({email: email});
  if (user) {
    const token = uuid.v4();
    Reset.save({
      '_id': user._id,
      'token': token,
      'created': Math.round(new Date().getTime() / 1000),
    });
    const html = yield render('email/inlined/forgot', {forgotUrl: process.env.WEB_BASE_URL + '/forgot/' + token});
    const text = `It seems you've forgotten your password :(
Visit  ${process.env.WEB_BASE_URL + '/forgot/' + token} to set a new one.
`;
    mandrill.messages.send({message: {
      html: html,
      text: text,
      subject: 'Hostr Password Reset',
      'from_email': 'jonathan@hostr.co',
      'from_name': 'Jonathan from Hostr',
      to: [{
        email: user.email,
        type: 'to',
      }],
      'tags': [
        'password-reset',
      ],
    }});
  } else {
    throw new Error('There was an error looking up your email address.');
  }
}


export function* fromToken(token) {
  const Users = this.db.Users;
  const reply = yield this.redis.get(token);
  return yield Users.findOne({_id: reply});
}


export function* fromCookie(cookie) {
  const Remember = this.db.Remember;
  const Users = this.db.Users;
  const remember = yield Remember.findOne({_id: cookie});
  return yield Users.findOne({_id: remember.user_id});
}


export function* validateResetToken() {
  const Reset = this.db.Reset;
  return yield Reset.findOne({token: this.params.id});
}


export function* updatePassword(userId, password) {
  const Users = this.db.Users;
  const cryptedPassword = yield passwords.crypt(password);
  yield Users.updateOne({_id: userId}, {'$set': {'salted_password': cryptedPassword}});
}


export function* activateUser(code) {
  const Users = this.db.Users;
  const user = yield Users.findOne({activationCode: code});
  if (user) {
    Users.updateOne({_id: user._id}, {'$unset': {activationCode: ''}});
    yield setupSession(this, user);
  } else {
    return false;
  }
}
