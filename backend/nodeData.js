const express = require("express");
const router = express.Router();
const SensorData = require("./models/SensorData");

function isKnownNodeId(nodeId) {
    return typeof nodeId === "string" && nodeId.trim() !== "" && nodeId.trim().toLowerCase() !== "unknown";
}

// GET /api/node-data/nodes - get a list of all unique node IDs
router.get("/nodes", async (req, res) => {
    try {
        const nodes = (await SensorData.distinct("nodeId")).filter(isKnownNodeId);
        res.status(200).json(nodes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/node-data - get 50 most recent entries
// /api/node-data?nodeId=Alpha
router.get("/", async (req, res) => {
    try {
        const filter = req.query.nodeId ? { nodeId: req.query.nodeId } : {};
        const results = await SensorData.find(filter)
            .sort({ timestamp: -1 })
            .limit(50);

        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/node-data/history - get latest 50 entries per node
router.get("/history", async (req, res) => {
    try {
        const HISTORY_SIZE = 50;
        let nodeIds = [];

        if (req.query.nodeIds) {
            nodeIds = String(req.query.nodeIds).split(",").map(id => id.trim()).filter(id => id.length > 0);
        } else {
            // Default to getting Distinct nodes if none provided
            nodeIds = await SensorData.distinct("nodeId");
            nodeIds = nodeIds.slice(0, 4); // Protect against too many nodes killing the graph
        }

        nodeIds = nodeIds.filter(isKnownNodeId);

        if (nodeIds.length === 0) {
            return res.status(200).json({ limit: HISTORY_SIZE, nodes: [], data: {} });
        }

        const grouped = await SensorData.aggregate([
            { $match: { nodeId: { $in: nodeIds } } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$nodeId",
                    readings: {
                        $push: {
                            temp: "$temp",
                            humidity: "$humidity",
                            pressure: "$pressure",
                            timestamp: "$timestamp",
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    nodeId: "$_id",
                    readings: { $slice: ["$readings", HISTORY_SIZE] },
                },
            },
        ]);

        // ensure all node data arrays are initialized even if zero documents exist right now
        const data = nodeIds.reduce((acc, nodeId) => {
            acc[nodeId] = [];
            return acc;
        }, {});

        grouped.forEach((entry) => {
            data[entry.nodeId] = entry.readings;
        });

        return res.status(200).json({ limit: HISTORY_SIZE, nodes: nodeIds, data });
    } catch (err) {
        return res.status(500).json({ message: err.message });
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
        const { nodeId, temp, humidity, pressure, timestamp } = req.body;

        const created = await SensorData.create({
            nodeId,
            temp,
            humidity,
            pressure,
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

