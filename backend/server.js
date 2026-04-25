const express = require('express')
const mongoose = require('mongoose')
const SensorData = require('./models/SensorData')
const mqtt = require('mqtt')
require('dotenv').config()

const options = {
    host: process.env.MQTT_URL,
    port: 8883,
    protocol: 'mqtts',
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
}

const client = mqtt.connect(options)
const app = express()

client.on('connect', function () {
    console.log('connected to broker')
    client.subscribe('farm/data')
})

client.on('error', function (error) {
    console.log(error);
});

client.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString())
        // each time message received
        console.log('received message:', topic, data)

        const dataReading = await SensorData.create(data)
    } catch (err) {
        console.log('error receiving mqtt message', err)
    }
})

app.use(express.json())

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Connected to mongo"))
    .catch((err) => console.error('db connection error'))

app.listen(3001, () => {
    console.log("backend running on port 3001")
})