export default function (sequelize, DataTypes) {
  const User = sequelize.define('user', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    plan: DataTypes.ENUM('Free', 'Pro'), // eslint-disable-line new-cap
    ip: 'inet',
    activated: DataTypes.BOOLEAN,
    banned: DataTypes.BOOLEAN,
    deleted: DataTypes.BOOLEAN,
  }, {
    classMethods: {
      associate: (models) => {
        User.hasMany(models.file);
        User.hasOne(models.activation);
      },
    },
  });

  return User;
}
