const passport = require('passport');
// const request = require('request');
const { Strategy: LocalStrategy } = require('passport-local');

passport.serializeUser((user, done) => {
  // done(null, user.id);
  done(null, 1);
});

passport.deserializeUser((id, done) => {
  done(null, {
    id: 1,
    profile: {
      name: 'Admin'
    }
  });
});

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {

  if (username.trim() === process.env.ADMIN_USERNAME
    && password.trim() === process.env.ADMIN_PASSWORD) {
    return done(null, {
      id: 1,
    });
  }
  return done(null, false, { msg: 'Invalid email or password.' });
}));

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
// exports.isAuthorized = (req, res, next) => {
//   const provider = req.path.split('/').slice(-1)[0];
//   const token = req.user.tokens.find(token => token.kind === provider);
//   if (token) {
//     next();
//   } else {
//     res.redirect(`/auth/${provider}`);
//   }
// };
