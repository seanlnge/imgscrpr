import * as Discord from 'discord.js'
import { GetChannel, UpdateChannel } from '../../../database/preference'
import { SendPremiumMessage } from '.././static';

const settings = {
    "allow_nsfw": ["Allow NSFW Posts", "yep..", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.guildId, response.channelId);
        Channel.channel.allow_nsfw = !Channel.channel.allow_nsfw;
    }],
    "allow_video": ["Allow Video Posts", "Video posts do not have sound and take longer to load", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.guildId, response.channelId);
        Channel.channel.allow_video = !Channel.channel.allow_video;
    }],
    "premium": ["Account Upgraded", "Support us through buying premium", async (response: Discord.Message) => {
        const message = await SendPremiumMessage(response, []);
        if(!message) return;
        
        await message.react('◀️');
        message.createReactionCollector({
            filter: (reaction) => reaction.emoji.name == '◀️'
        }).on('collect', () => message.delete());
    }],
    "done": ["Done", "Finalize setting changes", async (response: Discord.Message) => {
        await UpdateChannel(response.guildId, response.channelId);
        await response.delete();
    }]
};

/**
 * Allow admin to edit Imgscrpr channel settings
 * @param msg Discord message object
 */
export async function SendSettings(msg: Discord.Message) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const member = msg.guild.members.cache.find(a => a.id == msg.author.id);
    if(
        !Channel.channel.administrators.users.includes(msg.author.id)
        && !member.roles.cache.hasAny(...Channel.channel.administrators.roles)
        && !member.permissions.has("ADMINISTRATOR")
    ) return await msg.reply("You need to be an administrator to edit settings!");

    const make_embed = async (index: number) => {
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
        embed.setTitle("Imgscrpr Settings for #" + channel_name);

        for(const setting in settings) {
            let name = settings[setting][0];
            name = (Object.keys(settings)[index] == setting ? ':arrow_right: ' : ':black_large_square: ') + name;

            let value = Channel.channel[setting] == undefined ? undefined : Channel.channel[setting].toString();
            value = value ? ' - ' + value[0].toUpperCase() + value.slice(1) : '';

            embed.addField(name + value, settings[setting][1]);
        }
        
        return embed;
    }

    let index = 0;
    const response = await msg.channel.send({ embeds: [await make_embed(index)] });
    await response.react("🔺");
    await response.react("🔻");
    await response.react("↔️");
    // Collect reactions
    const Collector = response.createReactionCollector({
        filter: (reaction, user) => !user.bot && ['🔺', '🔻', '↔️'].includes(reaction.emoji.name),
        time: 120000,
        dispose: true,
    });

    // On reaction add
    Collector.on('collect', async (reaction, user) => {
        // User must be admin to allow for changes
        const member = msg.guild.members.cache.find(a => a.id == msg.author.id);
        if(
            !Channel.channel.administrators.users.includes(user.id)
            && !member.roles.cache.hasAny(...Channel.channel.administrators.roles)
            && !member.permissions.has("ADMINISTRATOR")
        ) return;

        // Move to different commands
        if(['🔺', '🔻'].includes(reaction.emoji.name)) {
            // Make sure index is positive when modulo-ing
            if(reaction.emoji.name == '🔺') {
                index = (index + Object.keys(settings).length - 1) % Object.keys(settings).length;
            }
            
            // Modulo to wrap around
            else {
                index = (index + 1) % Object.keys(settings).length;
            }
        } else {
            await settings[Object.keys(settings)[index]][2](response);
        }

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