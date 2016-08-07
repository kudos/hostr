export default function (sequelize, DataTypes) {
  const User = sequelize.define('user', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    name: DataTypes.STRING,
    plan: DataTypes.ENUM('Free', 'Pro'), // eslint-disable-line new-cap
    activated: DataTypes.BOOLEAN,
    banned: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE,
    oldId: DataTypes.STRING,
  }, {
    paranoid: true,
    indexes: [
      {
        fields: ['email'],
      },
    ],
    classMethods: {
      associate: (models) => {
        User.hasMany(models.file);
        User.hasMany(models.transaction);
        User.hasOne(models.activation);
      },
    },
  });

  return User;
}
