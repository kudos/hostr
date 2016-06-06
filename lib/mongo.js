import mongodb from 'mongodb-promisified';
const MongoClient = mongodb().MongoClient;
import debugname from 'debug';
const debug = debugname('hostr:mongo');

/* eslint no-param-reassign: ["error", { "props": false }] */
const configuredClient = new Promise((resolve, reject) => {
  debug('Connecting to Mongodb');
  return MongoClient.connect(process.env.MONGO_URL).then((client) => {
    debug('Successfully connected to Mongodb');
    client.Users = client.collection('users');
    client.Files = client.collection('files');
    client.Transactions = client.collection('transactions');
    client.Logins = client.collection('logins');
    client.Remember = client.collection('remember');
    client.Reset = client.collection('reset');
    client.Remember.ensureIndex({ created: 1 }, { expireAfterSeconds: 2592000 });
    client.Files.ensureIndex({ owner: 1, status: 1, time_added: -1 });
    client.ObjectId = client.objectId = mongodb().ObjectId;
    return resolve(client);
  }).catch((e) => {
    reject(e);
  });
}).catch((e) => {
  debug(e);
});

export default function mongo() {
  return function* dbMiddleware(next) {
    try {
      this.db = yield configuredClient;
    } catch (e) {
      debug(e);
    }
    yield next;
  };
}
