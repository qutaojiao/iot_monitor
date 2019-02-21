const mongoose = require('mongoose');

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
    }
}, { timestamps: true });
const Device = mongoose.model('devices', deviceSchema);
module.exports = Device;
