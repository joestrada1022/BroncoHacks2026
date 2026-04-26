const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const SensorData = require('./models/SensorData')
const nodeDataRoutes = require('./nodeData')
const mqtt = require('mqtt')
const http = require('http')
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
const server = http.Server(app)
const port = process.env.PORT || 3001

app.use(cors({
    origin: `http://${process.env.NEXT_PUBLIC_API_URL}:3000`
}))
app.use(express.json())
app.use('/api/node-data', nodeDataRoutes)

const io = require('socket.io')(server, {
    cors: {
        origin: `http://${process.env.NEXT_PUBLIC_API_URL}:3000`,
        methods: ['GET', 'POST'],
    },
})

io.on('connection', (socket) => {
    console.log('user connected to socket')

    socket.on('disconnect', () => {
        console.log('user disconnected')
    })
})

client.on('connect', function () {
    console.log('connected to broker')
    client.subscribe('farm/data')
})

client.on('error', function (error) {
    console.log(error)
})

client.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString())
        console.log('received message:', topic, data)

        const savedData = await SensorData.create(data)
        io.emit('dataReading', savedData)
    } catch (err) {
        console.log('error receiving mqtt message', err)
    }
})

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Connected to mongo'))
    .catch((err) => console.error('db connection error', err))

server.listen(port, () => {
    console.log(`backend running on port ${port}`)
})