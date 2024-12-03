const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Leaderboard = require('../models/leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the leaderboard for the counting channel.'),

    async execute(interaction) {
        const leaderboardData = await Leaderboard.find({ guildId: interaction.guild.id })
            .sort({ messageCount: -1 })
            .limit(10); // Top 10 contributors

        if (!leaderboardData.length) {
            const noDataEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('Leaderboard')
                .setDescription('No contributions yet!');
            await interaction.reply({ embeds: [noDataEmbed], ephemeral: true });
            return;
        }

        const leaderboardEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Leaderboard - Top Contributors')
            .setDescription(
                leaderboardData
                    .map((entry, index) => `**${index + 1}.** <@${entry.userId}> - **${entry.messageCount}** messages`)
                    .join('\n'),
            );
        await interaction.reply({ embeds: [leaderboardEmbed] });
    },
};
