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
  },
  'mqttOptions.statusTopic': {
    in: ['body'],
    errorMessage: 'This is required for Mqtt Check',
    custom: {
      options: (value, { req, location, path }) => {
        if (req.body && req.body.checks && req.body.checks.mqtt) {
          return (value.match(/.{1,}/) !== null);
        }
        return true;
      }
    }
  },
};

/**
 * GET /devices
 */
exports.getDevices = (req, res) => {
  Device.find({}).exec((err, devices) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.render('devices/devices', {
      title: 'Monitored devices',
      devices
    });
  });
};

/**
 * GET /addDevice
 */
exports.getAddDevice = (req, res) => {
  const device = new Device();
  res.render('devices/form', {
    title: 'Add Monitored Device',
    device
  });
};


function saveDevice(device, callback) {
  return device.save((err) => {
    if (err) {
      if (err.name === 'MongoError' && err.code === 11000) {
        callback({ ip: { msg: 'A device with the same IP already exists!' } });
      } else {
        console.error(err);
        callback({ _fatal: true });
      }
      return;
    }
    callback(false);
  });
}

/**
 * POST /devices/add
 */
exports.postAddDevice = (req, res) => {
  const errors = validationResult(req).mapped();
  console.log(errors);
  if (req.body.updateDevice) {
    return Device
      .findById(req.body.updateDevice)
      .exec((err, device) => {
        if (err) return res.status(500).send(err);
        if (!device) {
          req.flash('errors', { msg: 'Unknown device!' });
          return res.redirect('/devices');
        }
        device.ip = req.body.ip;
        device.alias = req.body.alias;
        device.checks = req.body.checks;
        if (device.checks && device.checks.mqtt) {
          device.mqttOptions = req.body.mqttOptions;
        }
        if (Object.keys(errors).length > 0) {
          req.flash('errors', { msg: 'Please check the errors below!' });
          return res.render('devices/form', {
            title: 'Update Monitored Device',
            updateDevice: device._id,
            device,
            errors: errors || {}
          });
        }
        return saveDevice(device, (errors) => {
          if (errors) {
            if (errors._fatal) {
              req.flash('errors', { msg: 'Something went wrong. Please check the logs!' });
            } else {
              req.flash('errors', { msg: 'Please check the errors below!' });
            }
            return res.render('devices/form', {
              title: 'Update Monitored Device',
              updateDevice: device._id,
              device,
              errors: errors || {}
            });
          }
          req.flash('success', { msg: 'Device saved!' });
          return res.status(301).redirect('/devices');
        });
      });
  }
  const device = new Device({
    ip: req.body.ip,
    alias: req.body.alias,
    checks: req.body.checks,
  });
  if (device.checks && device.checks.mqtt) {
    device.mqttOptions = req.body.mqttOptions;
  }
  return saveDevice(device, (errors) => {
    if (errors) {
      if (errors._fatal) {
        req.flash('errors', { msg: 'Something went wrong. Please check the logs!' });
      } else {
        req.flash('errors', { msg: 'Please check the errors below!' });
      }
      return res.render('devices/form', {
        title: 'Add Monitored Device',
        device,
        errors: errors || {}
      });
    }
    req.flash('success', { msg: 'Device saved!' });
    return res.status(301).redirect('/devices');
  });
};

/**
 * GET /devices/edit/?id=
 */
exports.getEditDevice = (req, res) => {
  if (!req.query.id) return res.status(400);
  return Device
    .findById(req.query.id)
    .exec((err, device) => {
      if (err) return res.status(500).send(err);
      if (!device) {
        req.flash('error', { msg: 'Unknown device!' });
        return res.redirect('/devices');
      }
      res.render('devices/form', {
        title: 'Update Monitored Device',
        updateDevice: device._id,
        device,
        errors: {}
      });
    });
};

/**
 * POST /devices/delete
 */
exports.postDeleteDevice = (req, res) => {
  if (!req.body.id) return res.status(400);
  return Device
    .findOneAndDelete({ _id: req.body.id })
    .exec((err) => {
      if (err) return res.status(500).send(err);
      req.flash('success', { msg: 'Device deleted!' });
      return res.redirect('/devices');
    });
};
