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

    mqttOptions: {
        statusTopic: { type: String, default: '' },
    },

    pingCheck: {
        pass: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
        since: { type: Date, default: Date.now },
    },
    otaCheck: {
        pass: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
        since: { type: Date, default: Date.now },
    },
    mqttCheck: {
        pass: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
        since: { type: Date, default: Date.now },
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
Device.findByMqttStatusTopic = (topic, cb) => {
    if (cb) {
        return this.find({ mqttOptions: { statusTopic: topic } }, cb);
    }
    return new Promise((resolve, reject) => {
        Device.find({ mqttOptions: { statusTopic: topic } }, (err, device) => {
            if (err) { return reject(err); }
            return resolve(device);
        })
    });
}
module.exports = Device;
