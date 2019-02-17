
/**
 * GET /devices
 */
exports.getDevices = (req, res) => {
  res.render('devices', {
    title: 'Devices',
  });
};
