import * as Discord from 'discord.js'
import { GetChannel, UpdateChannel } from '../../../database/preference'
import { UserIsAdmin } from './permissions';

const settings = {
    "allow_nsfw": ["Allow NSFW Posts", "...", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.guildId, response.channelId);
        Channel.channel.allow_nsfw = !Channel.channel.allow_nsfw;
    }],
    "allow_text": ["Allow Text Posts", "In case you _actually_ enjoy reading", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.guildId, response.channelId);
        Channel.channel.allow_text = !Channel.channel.allow_text;
    }],
    "allow_image": ["Allow Image Posts", "The ~~best~~ default Imgscrpr media format", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.guildId, response.channelId);
        Channel.channel.allow_image = !Channel.channel.allow_image;
    }],
    "allow_video": ["Allow Video Posts", "No audio, but still cool", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.guildId, response.channelId);
        Channel.channel.allow_video = !Channel.channel.allow_video;
    }],
    "extra_commands": ["Non-Admin Permissions", "Allows non-admin users to do `i.send` and other read-only commands", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.guildId, response.channelId);
        Channel.channel.extra_commands = !Channel.channel.extra_commands;
    }],
    "done": ["Done", "Are you?", async (response: Discord.Message) => {
        await UpdateChannel(response.guildId, response.channelId);
        await response.delete().catch(() => undefined);
    }]
};

/**
 * Allow admin to edit Imgscrpr channel settings
 * @param msg Discord message object
 */
export async function SendSettings(msg: Discord.Message) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    if(!UserIsAdmin(msg, msg.author.id)) return await msg.reply("You need to be an administrator to edit settings!").catch(() => undefined);

    const make_embed = async (index: number) => {
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
        embed.setTitle("Imgscrpr Settings for #" + channel_name);
        embed.setDescription("These settings allow you to change what Imgscrpr sends, as well as some other channel-wide preferences\n\u2800");

        for(const setting in settings) {
            let name = settings[setting][0];
            name = (Object.keys(settings)[index] == setting ? ':arrow_right: ' : ':black_large_square: ') + name;

            let value = Channel.channel[setting] == undefined ? undefined : Channel.channel[setting].toString();
            value = value ? ' - ' + value[0].toUpperCase() + value.slice(1) : '';

            embed.addField(name + value, settings[setting][1] + '\n\u2800');
        }
        
        return embed;
    }

    let index = 0;
    const response = await msg.channel.send({ embeds: [await make_embed(index)] }).catch(() => undefined);
    if(!response) return;
    await response.react("????").catch(() => undefined);
    await response.react("????").catch(() => undefined);
    await response.react("??????").catch(() => undefined);

    // Collect reactions
    const Collector = response.createReactionCollector({
        filter: (reaction, user) => !user.bot && ['????', '????', '??????'].includes(reaction.emoji.name),
        time: 120000,
        dispose: true,
    });

    // On reaction add
    Collector.on('collect', async (reaction, user) => {
        if(user.id != msg.author.id) return;

        // Move to different commands
        if(['????', '????'].includes(reaction.emoji.name)) {
            // Modulo to wrap around
            if(reaction.emoji.name == '????') index = (index + 1) % Object.keys(settings).length;
            
            // Make sure index is positive when modulo-ing
            else index = (index + Object.keys(settings).length - 1) % Object.keys(settings).length;

            // Remove reaction to allow for repeated reactions
            await response.edit({ embeds: [await make_embed(index)] }).catch(() => /* ok? dont care? */{});
            await response.reactions.resolve(reaction.emoji.name).users.remove(user.id).catch(() => /* ok? dont care? */{});
            return;
        }
        
        await settings[Object.keys(settings)[index]][2](response);
        
        // Remove reaction to allow for repeated reactions
        await response.edit({ embeds: [await make_embed(index)] }).catch(() => /* ok? dont care? */{});
        await response.reactions.resolve(reaction.emoji.name).users.remove(user.id).catch(() => /* ok? dont care? */{});
    });

    // At end of 2 minutes delete messages
    Collector.on('end', async () => {
        await response.delete().catch(() => /* ok? dont care? */{});
        await msg.delete().catch(() => /* ok? dont care? */{});
    });
}