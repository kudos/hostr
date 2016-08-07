const MongoClient = require('mongodb').MongoClient;

MongoClient.connect(process.env.MONGO_URL, function connect(err, db) {
  const collection = db.collection('files');
  collection.createIndex({
    'owner': 1,
    'status': 1,
    'time_added': -1,
  });
  db.close();
});
