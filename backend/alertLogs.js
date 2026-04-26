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

function parseSummaryBullets(rawText) {
    if (!rawText) return [];

    const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed?.bullets)) {
            return parsed.bullets.map((item) => String(item).trim()).filter(Boolean).slice(0, 6);
        }
    } catch (_) {
        // Fall through to line-based parsing.
    }

    return cleaned
        .split('\n')
        .map((line) => line.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 6);
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

// GET /api/alert-logs/summary?limit=10
// Uses Gemini to summarize recent incidents into concise bullet points.
router.get('/summary', async (req, res) => {
    try {
        const key = process.env.GEMINI_API_KEY;
        const limit = Math.min(parseLimit(req.query.limit), 20);

        const incidents = await AlertLog.find({})
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        if (incidents.length === 0) {
            return res.status(200).json({
                limit,
                count: 0,
                bullets: [
                    'No incidents recorded in the selected window.',
                    'Sensor network operating within expected parameters.',
                ],
            });
        }

        if (!key) {
            return res.status(200).json({
                limit,
                count: incidents.length,
                bullets: [
                    `Reviewed ${incidents.length} recent incidents.`,
                    'Gemini summary is unavailable because GEMINI_API_KEY is not set on the backend.',
                    'Set GEMINI_API_KEY in backend .env to enable AI-generated briefing bullets.',
                ],
            });
        }

        const incidentText = incidents
            .map((item, index) => {
                const ts = new Date(item.timestamp).toISOString();
                return `${index + 1}. node=${item.nodeId}, status=${item.status}, reason=${item.reason}, timestamp=${ts}`;
            })
            .join('\n');

        const prompt = [
            'You are generating a tactical incident briefing for an IoT command dashboard.',
            'Summarize the incidents below into 4 to 6 concise bullet points.',
            'Focus on patterns: severity, repeats, open vs resolved, and notable nodes.',
            'Return ONLY valid JSON in this exact shape: {"bullets":["...","..."]}.',
            '',
            'Incidents:',
            incidentText,
        ].join('\n');

        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent',
            {
                method: 'POST',
                headers: {
                    'x-goog-api-key': key,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            return res.status(502).json({ message: `Gemini request failed: ${errText}` });
        }

        const payload = await response.json();
        const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const bullets = parseSummaryBullets(text);

        return res.status(200).json({
            limit,
            count: incidents.length,
            bullets: bullets.length > 0 ? bullets : [
                `Reviewed ${incidents.length} recent incidents.`,
                'Unable to parse structured Gemini output, but incident ingestion and alerting are active.',
            ],
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
