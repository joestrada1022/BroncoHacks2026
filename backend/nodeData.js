const express = require("express");
const router = express.Router();
const SensorData = require("./models/SensorData");

// GET /api/node-data - get 50 most recent entries
router.get("/", async (req, res) => {
    try {
        const results = await SensorData.find()
            .sort({ timestamp: -1 })
            .limit(50);

        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/node-data/:id - get one entry by id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid id format" });
        }

        const record = await SensorData.findById(id);

        if (!record) {
            return res.status(404).json({ message: "Node data not found" });
        }

        return res.status(200).json(record);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// POST /api/node-data - create a new entry
router.post("/", async (req, res) => {
    try {
        const { nodeId, temp, humidity, timestamp } = req.body;

        const created = await SensorData.create({
            nodeId,
            temp,
            humidity,
            ...(timestamp ? { timestamp } : {}),
        });

        return res.status(201).json(created);
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }

        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;

