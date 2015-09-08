export default function* normalisedUser(id) {
  const user = yield this.db.Users.findOne({_id: id, status: {'$ne': 'deleted'}});
  const uploadedTotal = yield this.db.Files.count({owner: user._id, status: {'$ne': 'deleted'}});
  const uploadedToday = yield this.db.Files.count({owner: user._id, 'time_added': {'$gt': Math.ceil(Date.now() / 1000) - 86400}});

  return {
    'id': user._id,
    'email': user.email,
    'daily_upload_allowance': user.type === 'Pro' ? 'unlimited' : 15,
    'file_count': uploadedTotal,
    'max_filesize': user.type === 'Pro' ? 524288000 : 20971520,
    'plan': user.type || 'Free',
    'uploads_today': uploadedToday,
  };
}
