const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    countChannelId: { type: String, default: null },
    lastCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
