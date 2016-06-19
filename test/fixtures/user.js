import models from '../../models';

function createUser() {
  models.user.create({
    'email': 'test@hostr.co',
    'password': '$pbkdf2-256-1$2$kBhIDRqFwnF/1ms6ZHfME2o2$a48e8c350d26397fcc88bf0a7a2817b1cdcd1ffffe0521a5',
    'ip': '127.0.0.1',
    'plan': 'Free',
    'activated': true,
  }).then((user) => {
    user.save().then(() => {
      models.sequelize.close();
    });
  });
}

models.user.findOne({
  where: {
    email: 'test@hostr.co',
  },
}).then((user) => {
  if (user) {
    user.destroy().then(createUser);
  } else {
    createUser();
  }
});
