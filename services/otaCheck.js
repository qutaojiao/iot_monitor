const Bonjour = require('bonjour');
const Moment = require('moment');
const Device = require('../models/Device');
const DiscoveredDevice = require('../models/DiscoveredDevice');

function addDiscoveredDevice(service) {
    if (!service.addresses || service.addresses.length === 0 || !service.addresses[0]) { return false; }
    console.log('[otaCheck] Discovered unknown device: %s(%s)', service.addresses[0], service.name);
    DiscoveredDevice.deleteMany({ ip: service.addresses[0] }, (err) => {
        if (err) {
            console.error('[otaCheck] Error while trying to delete discovered device %s: %s', service.addresses[0], err.toString());
            return;
        }
        DiscoveredDevice.create({
            ip: service.addresses[0],
            extraInfo: service.txt || false,
            name: service.name || false,
            host: service.host || false,
            otaPort: service.port || false,
            type: service.type || false,
            protocol: service.protocol || false,
        }, (err) => {
            if (err) {
                console.error('[otaCheck] Error while trying to add discovered device: %s', err.toString());
            }
        });
    })
}

function updateDeviceStatus(device, status, extraInfo, cb) {
    console.debug('[otaCheck] Marking device %s as: %s', addr, state ? 'Up' : 'Down');
    device.otaCheck.pass = status;
    device.otaCheck.timestamp = new Date();
    if (!device.otaCheck.since || device.otaCheck.pass !== status) {
        device.otaCheck.since = device.otaCheck.timestamp;
    }
    if (extraInfo) {
        device.extraOtaInfo = extraInfo;
    }
    if (cb) {
        device.save(cb);
    }
    return device.save((err, device) => {
        if (err) {
            console.error('[otaCheck] Error saving ota status for %s: %s', device.ip, err.toString());
        }
        return true;
    });
}

function deleteExpiredDiscovered() {
    const now = Moment();
    const offlineDate = Moment().subtract(process.env.OTA_INTERVAL || 30, 'second');
    DiscoveredDevice.deleteMany({ 'createdAt': { $lte: offlineDate } }, (err) => {
        if (err) {
            console.error('[otaCheck] Error while trying to delete old discovered devices: %s', err.toString());
            return;
        }
    });
}

function setExpiredStatus() {
    const now = Moment();
    const offlineDate = Moment().subtract(process.env.OTA_INTERVAL || 30, 'second');
    Device.find({ 'otaCheck.timestamp': { $lte: offlineDate } }, (err, devices) => {
        if (err) {
            console.error('[otaCheck] Error while trying to find devices to update: %s', err.toString());
            return;
        }
        devices.forEach((device) => {
            console.debug('[otaCheck] Marking device %s as: Down', device.ip);
            updateDeviceStatus(device, false);
        });
    });
}

function discover(that) {
    console.log('[otaCheck] Discovering devices');
    that.browser.update();
    setTimeout(setExpiredStatus, 5 * 1000); // give the discovery procedure to update all discovered devices
    deleteExpiredDiscovered();
}

function handleServiceUp(service) {
    if (!service.addresses || service.addresses.length === 0 || !service.addresses[0]) { return false; }
    const addr = service.addresses[0];
    console.debug('[otaCheck] Received Up event for %s', addr);
    return Device.findByIp(addr)
        .then((device) => {
            if (!device) { return addDiscoveredDevice(service); }
            updateDeviceStatus(device, true, (service.txt ? service.txt : false));
        })
        .catch((err) => {
            console.error('[otaCheck] Error while trying to find known device with IP %s: %s', addr, err.toString());
        });
}
function handleServiceDown(service) {
    if (service.eddresses.length === 0) { return false; }
    const addr = service.addresses[0];
    console.debug('[otaCheck] Received down event for %s', addr);
    return Device.findByIp(addr)
        .then((device) => {
            if (!device) { return addDiscoveredDevice(service); }
            updateDeviceStatus(device, false, (service.txt ? service.txt : false));
        })
        .catch((err) => {
            console.error('[otaCheck] Error while trying to find known device with IP %s: %s', addr, err.toString());
        });
}


function OtaCheck() {
    this._working = false;
    this.bonjour = new Bonjour();
    this.browser = this.bonjour.find({ type: process.env.OTA_TYPE_QUERY || 'arduino' });
    console.log('[otaCheck] Discovering devices');
    this.browser.on('up', handleServiceUp);
    this.browser.on('down', handleServiceDown);
    this._timer = setInterval(discover, (process.env.OTA_INTERVAL || 30) * 1000, this);
    return this;
}

module.exports = OtaCheck;
