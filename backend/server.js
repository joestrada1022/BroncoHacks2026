const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config();

const app = express()

app.use(express.json())

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Connected to mongo"))
    .catch((err) => console.error('db connection error'))

app.listen(3001, () => {
    console.log("backend running on port 3001")
})