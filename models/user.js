export default function (sequelize, DataTypes) {
  const User = sequelize.define(
    "user",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      name: DataTypes.STRING,
      activated: DataTypes.BOOLEAN,
      banned: DataTypes.BOOLEAN,
      deletedAt: DataTypes.DATE,
      mongoId: DataTypes.STRING,
    },
    {
      paranoid: true,
      indexes: [
        {
          fields: ["email"],
        },
      ],
    },
  );

  User.associate = function associate(models) {
    User.hasMany(models.file);
    User.hasOne(models.activation);
  };

  return User;
}
