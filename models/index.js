import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';

const config = {
  dialect: 'postgres',
  protocol: 'postgres',
  quoteIdentifiers: true,
  logging: false,
};

const sequelize = new Sequelize(process.env.DATABASE_URL, config);
const db = {};

const modelFiles = fs
  .readdirSync(import.meta.dirname)
  .filter(file => (file.indexOf('.') !== 0) && (file !== 'index.js'));

for (const file of modelFiles) {
  const { default: defineModel } = await import(path.join(import.meta.dirname, file));
  const model = defineModel(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
