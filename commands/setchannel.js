const GuildConfig = require('../models/guildConfig');

module.exports = {
    data: {
        name: 'setchannel',
        description: 'Set the channel where counting will occur',
    },
    async execute(interaction) {
        const channel = interaction.channel;

        // Find or create the configuration for this guild
        let guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
        if (!guildConfig) {
            guildConfig = new GuildConfig({ guildId: interaction.guildId });
        }

        guildConfig.countChannelId = channel.id;
        guildConfig.lastCount = 0; // Reset count when changing channels
        await guildConfig.save();

        await interaction.reply(`Counting channel has been set to ${channel}`);
    },
};
