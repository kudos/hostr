export default function (sequelize, DataTypes) {
  const Reset = sequelize.define('reset', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  }, {
    classMethods: {
      associate: (models) => {
        Reset.belongsTo(models.user);
      },
    },
  });

  return Reset;
}
