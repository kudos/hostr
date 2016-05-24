const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/hostr';

MongoClient.connect(url, function connect(err, db) {
  const collection = db.collection('users');
  collection.remove({
    'email': 'test@hostr.co',
  });
  collection.save({
    'email': 'test@hostr.co',
    'salted_password': '$pbkdf2-256-1$2$kBhIDRqFwnF/1ms6ZHfME2o2$a48e8c350d26397fcc88bf0a7a2817b1cdcd1ffffe0521a5',
    'joined': Math.ceil(Date.now() / 1000),
    'signup_ip': '127.0.0.1',
  });
  db.close();
});
