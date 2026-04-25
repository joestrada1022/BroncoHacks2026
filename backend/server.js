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
app.use(express.json())
const server = require('http').Server(app)
const port = process.env.PORT || 3001

const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000", // Update this to match your frontend URL if different
        methods: ["GET", "POST"]
    }
})

io.on('connection', socket => {
    console.log("user connected to socket")

    socket.on('disconnect', () => {
        console.log("user disconnected")
    })
})



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
        io.emit('dataReading', data)
    } catch (err) {
        console.log('error receiving mqtt message', err)
    }
})


mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Connected to mongo"))
    .catch((err) => console.error('db connection error'))

server.listen(port, () => {
    console.log(`backend running on port ${port}`)
})