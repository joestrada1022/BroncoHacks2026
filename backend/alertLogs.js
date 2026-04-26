const express = require('express');
const router = express.Router();
const AlertLog = require('./models/AlertLog');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function parseLimit(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
    return Math.min(parsed, MAX_LIMIT);
}

// GET /api/alert-logs?limit=100&status=Open
// Returns latest alert logs, capped by MAX_LIMIT.
router.get('/', async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit);
        const filter = {};

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const results = await AlertLog.find(filter)
            .sort({ timestamp: -1 })
            .limit(limit);

        return res.status(200).json({
            count: results.length,
            limit,
            results,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});


// PATCH /api/alert-logs/:id/status
// Body: { status: "Open" | "Resolved" }
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid id format' });
        }

        if (!['Open', 'Resolved'].includes(status)) {
            return res.status(400).json({ message: 'Status must be Open or Resolved' });
        }

        const updated = await AlertLog.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Alert log not found' });
        }

        return res.status(200).json(updated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
