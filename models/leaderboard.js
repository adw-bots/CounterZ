const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    messageCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
