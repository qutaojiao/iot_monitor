const Promise = require('bluebird');
const Ping = require('net-ping');
const Device = require('../models/Device');

const pingSessionOptions = {
    networkProtocol: Ping.NetworkProtocol.IPv4,
    packetSize: 84,
    retries: 1,
    sessionId: (process.pid % 65535),
    timeout: 1000,
    ttl: 128
};

function getDevicesToPing() {
    return new Promise((resolve, reject) => {
        Device.find({ 'checks.ping': true })
            .exec((err, devices) => {
                if (err) return reject(err);
                return resolve(devices);
            });
    });
}

function pingDevices(that) {
    console.debug('[pingCheck] Starting ping checks...');
    return getDevicesToPing()
        .catch((err) => {
            console.error('[pingCheck] An error occured while getting devices to ping');
            console.error(err);
            return false;
        })
        .map((device) => {
            console.debug('[pingCheck] Sending ping to %s', device.ip);
            return that.pingSession.pingHost(device.ip, (error, target) => {
                device.pingCheck.timestamp = new Date();
                const currentStatus = !error;
                if (!device.pingCheck.since || device.pingCheck.pass !== currentStatus) {
                    device.pingCheck.since = device.pingCheck.timestamp;
                }
                device.pingCheck.pass = currentStatus;
                console.debug('[pingCheck] Got ping result for %s: %s', target, !error ? 'Up' : 'Down');
                device.save((err, device) => {
                    if (err) {
                        console.error('[pingCheck] Error saving ping status for %s: %s', device.ip, err.toString());
                    }
                    return true;
                });
            });
        })
        .catch((err) => {
            console.error('[pingCheck] Error occured: %s', err.toString());
        });
}

function PingCheck() {
    this.pingSession = Ping.createSession(pingSessionOptions);
    this._timer = setInterval(pingDevices, (process.env.PING_INTERVAL || 30) * 1000, this);
    return this;
}

module.exports = PingCheck;
