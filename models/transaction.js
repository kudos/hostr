export default function (sequelize, DataTypes) {
  const Transaction = sequelize.define('transaction', {
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    amount: DataTypes.DECIMAL,
    description: DataTypes.STRING,
    type: DataTypes.ENUM('direct', 'paypal'), // eslint-disable-line new-cap
    ip: 'inet',
    data: DataTypes.JSON,
  }, {
    indexes: [
      {
        fields: ['userId'],
      },
    ],
  });

  Transaction.associate = function associate(models) {
    Transaction.belongsTo(models.user);
  };

  return Transaction;
}
