const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    nodeId: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["Open", "Resolved"], default: "Open" },
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number, default: 0 }
});

// alertSchema.pre('save', function (next) {
//     if (this.isModified('status') && this.status === 'Resolved' && this.timestamp) {
//         this.duration = Date.now() - this.timestamp.getTime();
//     }
//     next();
// });

module.exports = mongoose.model('AlertLog', alertSchema);