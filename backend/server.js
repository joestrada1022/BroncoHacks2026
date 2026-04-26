const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const SensorData = require('./models/SensorData')
const AlertLog = require('./models/AlertLog')
const nodeDataRoutes = require('./nodeData')
const alertLogsRoutes = require('./alertLogs')
const mqtt = require('mqtt')
const http = require('http')
require('dotenv').config()


let lastAlertSent = 0;
const ALERT_COOLDOWN_MS = 30000;

const nodeStates = {};
const alertLifecycle = {};
const STABLE_READING_NEEDED = 2;
const THRESHOLDS = {
    tempDelta: 20.0,
    humidityDelta: 10.0
};

async function hydrateOpenAlertForNode(nodeId) {
    const latestOpen = await AlertLog.findOne({ nodeId, status: 'Open' })
        .sort({ timestamp: -1 })
        .select('_id');

    return latestOpen ? latestOpen._id : null;
}

async function sendDiscordAlert(data, anomalyReason) {
    const now = Date.now();
    if (now - lastAlertSent < ALERT_COOLDOWN_MS) return;

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('Skipping Discord Alert: Add DISCORD_WEBHOOK_URL to .env');
        return;
    }

    const payload = {
        username: "TACTICAL ARRAY - SYSTEM ALERT",
        avatar_url: "https://i.imgur.com/D7nRwsx.jpeg",
        embeds: [{
            title: `SENSORY ANOMALY DETECTED: NODE ${data.nodeId}`,
            color: 16711680, // red
            description: `**Alert Reason:** ${anomalyReason}\nA sensor node has breached standard operational delta limits.`,
            fields: [
                { name: "Core Temperature", value: `${data.temp}°F`, inline: true },
                { name: "Current Humidity", value: `${data.humidity}%`, inline: true },
                { name: "Timestamp", value: new Date().toISOString(), inline: false }
            ],
            footer: { text: "Tactical Sensor Network - Automated Defense System" }
        }]
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`[TACTICAL ALERT DISPATCHED] Sent to Discord Webhook`);
        lastAlertSent = now;
    } catch (err) {
        console.error('Discord Webhook Error:', err);
    }
}

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
app.use('/api/alert-logs', alertLogsRoutes)

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

        const previousData = nodeStates[data.nodeId];
        if (previousData) {
            const tempDelta = Math.abs(data.temp - previousData.temp);
            const humidityDelta = Math.abs(data.humidity - previousData.humidity);

            if (!alertLifecycle[data.nodeId]) {
                alertLifecycle[data.nodeId] = {
                    isOpen: false,
                    stableReadingCount: 0,
                    openAlertId: null,
                    hydrated: false,
                };
            }

            const nodeAlert = alertLifecycle[data.nodeId];

            // Recover any open alert from MongoDB after server restarts.
            if (!nodeAlert.hydrated) {
                nodeAlert.openAlertId = await hydrateOpenAlertForNode(data.nodeId);
                nodeAlert.isOpen = Boolean(nodeAlert.openAlertId);
                nodeAlert.hydrated = true;
            }

            const tempSpike = tempDelta >= THRESHOLDS.tempDelta;
            const humiditySpike = humidityDelta >= THRESHOLDS.humidityDelta;
            const hasSpike = tempSpike || humiditySpike;

            if (hasSpike) {
                nodeAlert.stableReadingCount = 0;

                if (!nodeAlert.isOpen) {
                    let reason = 'Sudden Sensor Shift';
                    let discordReason = reason;

                    if (tempSpike) {
                        const tempDiff = data.temp - previousData.temp;
                        reason = `Sudden Temp Shift (${tempDiff.toFixed(1)}°F)`;
                        discordReason = `Sudden Temperature Shift Detected (Shifted by ${tempDelta.toFixed(1)}°F)`;
                    } else if (humiditySpike) {
                        const humDiff = data.humidity - previousData.humidity;
                        reason = `Sudden Humidity Spike (${humDiff.toFixed(1)}%)`;
                        discordReason = `Sudden Humidity Shift Detected (Shifted by ${humidityDelta.toFixed(1)}%)`;
                    }

                    sendDiscordAlert(data, discordReason);

                    const alertLog = await AlertLog.create({
                        nodeId: data.nodeId,
                        reason,
                        status: 'Open',
                    });

                    io.emit('alertLogUpdated', {
                        type: 'created',
                        alert: alertLog,
                    });

                    nodeAlert.isOpen = true;
                    nodeAlert.openAlertId = alertLog._id;
                }
            } else if (nodeAlert.isOpen) {
                nodeAlert.stableReadingCount += 1;

                if (nodeAlert.stableReadingCount >= STABLE_READING_NEEDED) {
                    let resolvedAlert = null;

                    if (nodeAlert.openAlertId) {
                        resolvedAlert = await AlertLog.findByIdAndUpdate(
                            nodeAlert.openAlertId,
                            { status: 'Resolved' },
                            { new: true }
                        );
                    } else {
                        resolvedAlert = await AlertLog.findOneAndUpdate(
                            { nodeId: data.nodeId, status: 'Open' },
                            { status: 'Resolved' },
                            { sort: { timestamp: -1 }, new: true }
                        );
                    }

                    if (resolvedAlert) {
                        io.emit('alertLogUpdated', {
                            type: 'resolved',
                            alert: resolvedAlert,
                        });
                    }

                    nodeAlert.isOpen = false;
                    nodeAlert.stableReadingCount = 0;
                    nodeAlert.openAlertId = null;
                }
            }
        }

        nodeStates[data.nodeId] = { temp: data.temp, humidity: data.humidity };

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