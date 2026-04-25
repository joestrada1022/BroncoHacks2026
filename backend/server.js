const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config();

const app = express()
app.use(express.json())

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Connected to mongo"))
    .catch((err) => console.error('db connection error', err))

server.listen(port, () => {
    console.log(`backend running on port ${port}`)
})