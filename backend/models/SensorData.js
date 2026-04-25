const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
    nodeId: { type: String, required: true },
    temp: { type: Number, required: true },
    humidity: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SensorData', sensorSchema);