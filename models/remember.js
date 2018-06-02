export default function (sequelize, DataTypes) {
  const Remember = sequelize.define('remember', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  });

  Remember.associate = function associate(models) {
    Remember.belongsTo(models.user);
  };

  return Remember;
}
