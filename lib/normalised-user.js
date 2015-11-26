export default function* normalisedUser(userId) {
  const users = yield this.rethink.table('users').getAll(userId);
  this.assert(users[0], 400, '{"error": {"message": "Invalid auth token.", "code": 606}}');
  const user = users[0];
  const uploadedTotal = yield this.rethink
    .table('files')
    .getAll(userId, {index: 'userId'})
    .filter(this.rethink.row('status').ne('deleted'), {default: true})
    .count();
  const uploadedToday = yield this.rethink
    .table('files')
    .getAll(userId, {index: 'userId'})
    .filter(this.rethink.row('status').ne('deleted'), {default: true})
    .filter(this.rethink.row('created').gt(new Date()))
    .count();

  return {
    'id': user.id,
    'email': user.email,
    'daily_upload_allowance': user.type === 'Pro' ? 'unlimited' : 15,
    'file_count': uploadedTotal,
    'max_filesize': user.type === 'Pro' ? 524288000 : 20971520,
    'plan': user.type || 'Free',
    'uploads_today': uploadedToday,
  };
}
