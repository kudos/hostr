export default function (sequelize, DataTypes) {
  const File = sequelize.define('file', {
    id: { type: DataTypes.STRING(12), primaryKey: true }, // eslint-disable-line new-cap
    name: DataTypes.TEXT,
    originalName: DataTypes.TEXT,
    size: DataTypes.BIGINT,
    downloads: DataTypes.BIGINT,
    accessedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
    processed: DataTypes.BOOLEAN,
    type: DataTypes.ENUM( // eslint-disable-line new-cap
      'image',
      'audio',
      'video',
      'archive',
      'other'
    ),
    width: DataTypes.INTEGER,
    height: DataTypes.INTEGER,
    ip: 'inet',
    legacyId: DataTypes.STRING(12), // eslint-disable-line new-cap
    md5: DataTypes.STRING(32), // eslint-disable-line new-cap
    malwarePositives: DataTypes.INTEGER,
    mongoId: DataTypes.STRING,
  }, {
    paranoid: true,
    indexes: [
      {
        fields: ['userId'],
      },
    ],
  });

  File.accessed = function accessed(id) {
    sequelize.query(`
      UPDATE files
      SET "downloads" = downloads + 1, "accessedAt" = NOW()
      WHERE "id" = :id`,
    {
      replacements: { id },
      type: sequelize.QueryTypes.UPDATE,
    }
    );
  };

  File.associate = function associate(models) {
    File.belongsTo(models.user);
    File.hasOne(models.malware);
  };

  return File;
}
