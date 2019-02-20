const { validationResult } = require('express-validator/check');
const Ipv6 = require('ip-address').Address6;
const Ipv4 = require('ip-address').Address4;
const Device = require('../models/Device');

exports.validationSchema = {
  ip: {
    in: ['body'],
    errorMessage: 'Incorrect IP address',
    custom: {
      options: (value) => {
        const vipv4 = new Ipv4(value);
        const vipv6 = new Ipv6(value);
        return vipv4.isValid() || vipv6.isValid();
      }
    }
  },
  alias: {
    in: ['body'],
    isString: true,
    optional: true,
  }
};

/**
 * GET /devices
 */
exports.getDevices = (req, res) => {
  res.render('devices/devices', {
    title: 'Monitored devices',
  });
};

/**
 * GET /addDevice
 */
exports.getAddDevice = (req, res) => {
  const device = new Device();
  res.render('devices/add', {
    title: 'Add Monitored Device',
    device
  });
};

/**
 * POST /devices/add
 */
exports.postAddDevice = (req, res) => {
  console.log(req.body);
  let errors = validationResult(req).mapped();
  const device = new Device({
    ip: req.body.ip,
    alias: req.body.alias,
    checks: req.body.checks,
  });

  if (Object.keys(errors).length > 0) {
    console.log('Errors ');
    console.log(errors);
    if (Object.keys(errors).length > 0) {
      req.flash('errors', { msg: 'Please check the errors below!' });
    }
    res.render('devices/add', {
      title: 'Add Monitored Device',
      device,
      errors
    });
  } else {
    device.save((err) => {
      if (err) {
        if (err.name === 'MongoError' && err.code === 11000) {
          errors = {
            ip: {
              msg: 'A device with the same IP already exists!'
            }
          };
          req.flash('errors', { msg: 'Please check the errors below!' });
          res.render('devices/add', {
            title: 'Add Monitored Device',
            device,
            errors
          });
        } else {
          return res.status(500).send(err);
        }
      }
    });
  }
  req.flash('success', { msg: 'Device saved!' });
  return res.status(301).redirect('/devices');
};
