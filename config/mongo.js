import mongodb from 'mongodb-promisified';
const MongoClient = mongodb().MongoClient;
import debugname from 'debug';
const debug = debugname('hostr-api:db');

const uristring = process.env.MONGO_URL || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/hostr';

export default function*() {
  debug('Connecting to Mongodb');
  const client = yield MongoClient.connect(uristring);
  debug('Successfully connected to Mongodb');
  client.Users = client.collection('users');
  client.Files = client.collection('files');
  client.Transactions = client.collection('transactions');
  client.Logins = client.collection('logins');
  client.Remember = client.collection('remember');
  client.Reset = client.collection('reset');
  client.Remember.ensureIndex({'created': 1}, {expireAfterSeconds: 2592000});
  client.Files.ensureIndex({'owner': 1, 'status': 1, 'time_added': -1});
  return client;
}
