export default function (sequelize, DataTypes) {
  const Activation = sequelize.define('activation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    activated: false,
    email: DataTypes.STRING,
  }, {
    classMethods: {
      associate: (models) => {
        Activation.belongsTo(models.user);
      },
    },
  });

  return Activation;
}
