const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'help',
        description: 'Displays bot commands and information',
    },
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Bot Help')
            .setDescription('Commands and instructions for the bot')
            .addFields(
                { name: '/setchannel', value: 'Sets the counting channel for the server.' },
                { name: 'Counting Rules', value: 'Start from `1` and increment by 1. Any mistake will result in a ❌ reaction and a reset.' }
            )
            .setFooter({ text: 'Have fun counting!' });

        await interaction.reply({ embeds: [embed] });
    },
};
