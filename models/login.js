export default function (sequelize, DataTypes) {
  const Login = sequelize.define('login', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    successful: { type: DataTypes.BOOLEAN },
    ip: { type: 'inet' },
  }, {
    indexes: [
      {
        fields: ['ip'],
      },
    ],
  });

  Login.associate = function associate(models) {
    Login.belongsTo(models.user);
  };

  return Login;
}
