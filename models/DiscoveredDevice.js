const mongoose = require('mongoose');

const discoveredDeviceSchema = new mongoose.Schema({
    ip: { type: String, unique: true },
    extraInfo: { type: {} },
    name: String,
    host: String,
    otaPort: Number,
    type: String,
    protocol: String,
}, { timestamps: true });
const DiscoveredDevice = mongoose.model('discovered_devices', discoveredDeviceSchema);
module.exports = DiscoveredDevice;
