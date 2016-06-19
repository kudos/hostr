export default function (sequelize, DataTypes) {
  const Login = sequelize.define('login', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    successful: { type: DataTypes.BOOLEAN },
    ip: { type: 'inet' },
  }, {
    classMethods: {
      associate: (models) => {
        Login.belongsTo(models.user);
      },
    },
  });

  return Login;
}
