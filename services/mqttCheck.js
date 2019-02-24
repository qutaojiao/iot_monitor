const Promise = require('bluebird');
const mqtt = require('mqtt');
const fs = require('fs');
const Moment = require('moment');
const Device = require('../models/Device');

function getDevices() {
    return new Promise((resolve, reject) => {
        Device.find({ 'checks.mqtt': true })
            .exec((err, devices) => {
                if (err) return reject(err);
                return resolve(devices);
            });
    });
}

function onMqttClose() {
    console.log('[mqttCheck] Disconnected from Mqtt broker ...');
}
function onMqttReconnect() {
    console.log('[mqttCheck]  Reconnecting to Mqtt broker ...');
}
function onMqttError(err) {
    console.error('[mqttCheck] MQTT error: %s', err.toString());
}

function getConnectionOptions() {
    if (!process.env.MQTT_HOST) {
        return false;
    }
    if (process.env.MQTT_SSL_KEY) {
        const ssl_key = fs.readFileSync(process.env.MQTT_SSL_KEY);
    }
    if (process.env.MQTT_SSL_CERT) {
        const ssl_cert = fs.readFileSync(process.env.MQTT_SSL_CERT);
    }
    return {
        host: process.env.MQTT_HOST,
        port: process.env.MQTT_PORT || 1883,
        key: process.env.MQTT_SSL_KEY ? ssl_key : false,
        cert: process.env.MQTT_SSL_CERT ? ssl_cert : false,
        rejectUnauthorized: false,
        keepalive: 60,
        clientId: 'iot_monitor_' + Math.random().toString(16).substr(2, 8),
        // protocolVersion: process.env.MQTT_PROTOCOL_VER || '3.1.1',
        username: process.env.MQTT_USERNAME || false,
        password: process.env.MQTT_PASSWORD || false,
    }
}

function updateDeviceStatus(device, status, cb) {
    console.debug('[mqttCheck] Marking device %s as: %s', device.ip, status ? 'Up' : 'Down');
    if (!device.mqttCheck) {
        device.mqttCheck = {
            pass: false,
            since: new Date(),
            timestamp: new Date(),
        };
    }
    device.mqttCheck.pass = status;
    device.mqttCheck.timestamp = new Date();
    if (!device.mqttCheck.since || device.mqttCheck.pass !== status) {
        device.mqttCheck.since = device.mqttCheck.timestamp;
    }
    if (cb) {
        device.save(cb);
    }
    return device.save((err, device) => {
        if (err) {
            console.error('[mqttCheck] Error saving mqtt status for %s: %s', device.ip, err.toString());
        }
        return true;
    });
}

function flushActiveState(that) {
    const now = Moment();
    const offlineDate = Moment().subtract(process.env.MQTT_FLUSH_INTERVAL || 30, 'second');
    Device.find({ 'mqttCheck.timestamp': { $lte: offlineDate } }, (err, devices) => {
        if (err) {
            console.error('[mqttCheck] Error while trying to find devices to update: %s', err.toString());
            return;
        }
        devices.forEach((device) => {
            console.debug('[mqttCheck] Marking device %s as: Down because of flush timer', device.ip);
            updateDeviceStatus(device, false);
        });
    });
}

function MqttCheck() {
    this._options = getConnectionOptions();
    return this;
}

MqttCheck.prototype._addSubscriptions = function () {
    const that = this;
    return getDevices()
        .map((device) => {
            if (device.mqttOptions.statusTopic.length === 0) {
                console.warn('[mqttCheck] Device %s(%s) has empty mqtt status topic.', device.ip, device.alias);
                return false;
            }
            return new Promise((resolve, reject) => {
                that.client.subscribe(device.mqttOptions.statusTopic, false, (err, { topic, qos }) => {
                    if (err) {
                        console.error('[mqttCheck] Error subscribing to topic %s: %s', device.mqttOptions.statusTopic, err.toString());
                        return reject(err);
                    }
                    console.debug('[mqttCheck] Successfully subscribed to topic %s', device.mqttOptions.statusTopic);
                    return resolve(true);
                });
            });
        })
}

MqttCheck.prototype._handleMqttMessage = function (topic, message) {
    console.debug('[mqttCheck] Received message on topic %s: %s', topic, message.toString());
    return Device.findByMqttStatusTopic(topic)
        .then((devices) => {
            if (!devices || devices.length === 0) {
                console.warn('[mqttCheck] Cound not find any device with Mqtt statusTopic \'%s\' ', topic);
                return [];
            }
            return devices;
        })
        .map((device) => {
            const online = process.env.MQTT_DEVICE_ONLINE_PAYLOAD || 'online';
            const offline = process.env.MQTT_DEVICE_OFFLINE_PAYLOAD || 'offline';
            if (message.toString() !== online && message.toString() !== offline) {
                console.warn('[mqttCheck] Received invalid payload  \'%s\' on topic %s', message.toString(), topic);
                return false;
            }
            return updateDeviceStatus(device, message.toString() === 'online');
        })
        .catch((err) => {
            console.error('[mqttCheck] Error while trying to find device with Mqtt status topic %s: %s', topic, err.toString());
        });
};

MqttCheck.prototype.start = function () {
    if (!this._options) {
        console.warn('[mqttCheck] MQTT check is disabled because of missing required configuration option!');
        return;
    }
    console.log('[mqttCheck] Starting...');
    this.client = mqtt.connect(this._options);
    const that = this;
    this.client.on('connect', () => {
        console.log('[mqttCheck] Connected to Mqtt broker @ %s', process.env.MQTT_HOST);
        that._addSubscriptions();
    });
    this.client.on('reconnect', onMqttReconnect);
    this.client.on('close', onMqttClose);
    this.client.on('error', onMqttError);
    this.client.on('message', that._handleMqttMessage);
    if (process.env.MQTT_FLUSH_INTERVAL) {
        this._flushTimer = setInterval(flushActiveState, process.env.MQTT_FLUSH_INTERVAL * 1000, this);
    }
}

MqttCheck.prototype.stop = function (cb) {
    console.log('[mqttCheck] Stoping...');
    if (this.client) {
        this.client.end(false, false, cb);
    }
}
module.exports = MqttCheck;