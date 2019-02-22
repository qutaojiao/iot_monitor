const mongoose = require('mongoose');
const Promise = require('bluebird');

const deviceSchema = new mongoose.Schema({
    ip: { type: String, unique: true },
    alias: String,

    checks: {
        ping: { type: Boolean, default: true },
        ota: { type: Boolean, default: false },
        mqtt: { type: Boolean, default: false },
    },

    pingCheck: {
        pass: Boolean,
        timestamp: Date,
        since: Date,
    },
    otaCheck: {
        pass: Boolean,
        timestamp: Date,
        since: Date,
    },
    mqttCheck: {
        pass: Boolean,
        timestamp: Date,
        since: Date,
    },
    extraOtaInfo: { type: {} },
}, { timestamps: true });
const Device = mongoose.model('devices', deviceSchema);
Device.findByIp = (ip, cb) => {
    if (cb) {
        return this.find({ 'ip': ip }, cb);
    }
    return new Promise((resolve, reject) => {
        Device.findOne({ ip: ip }, (err, device) => {
            if (err) { return reject(err); }
            return resolve(device);
        })
    });
}
module.exports = Device;
