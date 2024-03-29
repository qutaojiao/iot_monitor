/**
 * Module dependencies.
 */
const isRoot = require('is-root');

if (!isRoot()) {
  console.error('This process must be executed with root privileges.');
  process.exit(1);
}

const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const sass = require('node-sass-middleware');
const { checkSchema } = require('express-validator/check');
const PingCheck = require('./services/pingCheck');
const OtaCheck = require('./services/otaCheck');
const MqttCheck = require('./services/mqttCheck');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env' });

/**
 * INitialize services
 */
const SERVICES = {};

/**
 * Controllers (route handlers).
 */
const userController = require('./controllers/user');
// const apiController = require('./controllers/api');
const devicesController = require('./controllers/devices');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Start services
 */
SERVICES['ping-check'] = new PingCheck();
SERVICES['ota-check'] = new OtaCheck();
SERVICES['mqtt-check'] = new MqttCheck();

/**
 * Express configuration.
 */
app.set('host', process.env.APP_IP || '0.0.0.0');
app.set('port', process.env.APP_PORT || 5000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(compression());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
  store: new MongoStore({
    url: process.env.MONGODB_URI,
    autoReconnect: true,
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  lusca.csrf()(req, res, next);
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.locals.user = req.user;
  req.services = SERVICES;
  next();
});

app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user
    && req.path !== '/login'
    && !req.path.match(/^\/auth/)
    && !req.path.match(/\./)) {
    req.session.returnTo = req.originalUrl;
  } else if (req.user
    && (req.path === '/account' || req.path.match(/^\/api/))) {
    req.session.returnTo = req.originalUrl;
  }
  next();
});
app.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/popper.js/dist/umd'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/jquery/dist'), { maxAge: 31557600000 }));
app.use('/webfonts', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts'), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get('/', passportConfig.isAuthenticated, devicesController.getDevices);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);

app.get('/devices', passportConfig.isAuthenticated, devicesController.getDevices);
app.get('/devices/add', passportConfig.isAuthenticated, devicesController.getAddDevice);
app.post('/devices/add', passportConfig.isAuthenticated, checkSchema(devicesController.validationSchema), devicesController.postAddDevice);
app.get('/devices/edit', passportConfig.isAuthenticated, devicesController.getEditDevice);
app.post('/devices/delete', passportConfig.isAuthenticated, devicesController.postDeleteDevice);

/**
 * API examples routes.
 */
// app.get('/api', apiController.getApi);

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
} else {
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Server Error');
  });
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('%s App is running at %s:%d in %s mode', chalk.green('✓'), app.get('host'), app.get('port'), app.get('env'));
  console.log('');
  console.log('Starting services...');
  startAllServices();
});

function startAllServices() {
  Object.keys(SERVICES).forEach((srv) => {
    SERVICES[srv].start();
  });
}
module.exports = app;
