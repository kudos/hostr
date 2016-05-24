const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/hostr';

MongoClient.connect(url, function connect(err, db) {
  const collection = db.collection('files');
  collection.createIndex({
    'owner': 1,
    'status': 1,
    'time_added': -1,
  });
  db.close();
});
