export default function (sequelize, DataTypes) {
  const Activation = sequelize.define('activation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    activatedAt: { type: DataTypes.DATE },
    email: DataTypes.STRING,
  });

  Activation.associate = function associate(models) {
    Activation.belongsTo(models.user);
  };

  return Activation;
}
