import * as Discord from 'discord.js'
import { GetChannel, UpdateChannelPreference } from '../../../database/preference'
import { SendPremiumMessage } from '.././static';

const settings = {
    "allow_nsfw": ["Allow NSFW Posts", "yep..", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.channelId);
        Channel.channel.allow_nsfw = !Channel.channel.allow_nsfw;
    }],
    "allow_video": ["Allow Video Posts", "Video posts do not have sound and take longer to load", async (response: Discord.Message) => {
        const Channel = await GetChannel(response.channelId);
        Channel.channel.allow_video = !Channel.channel.allow_video;
    }],
    "premium": ["Account Upgraded", "Support us through buying premium", async (response: Discord.Message) => {
        const message = await SendPremiumMessage(response);
        await message.react('◀️');
        message.createReactionCollector({
            filter: (reaction) => reaction.emoji.name == '◀️'
        }).on('collect', () => message.delete());
    }],
    "done": ["Done", "Finalize setting changes", async (response: Discord.Message) => {
        await UpdateChannelPreference(response.channelId);
        await response.delete();
    }]
};

/**
 * Allow admin to edit Imgscrpr channel settings
 * @param msg Discord message object
 */
export async function SendSettings(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);

    const make_embed = async (index: number) => {
        const embed = new Discord.MessageEmbed();
        embed.setTitle("Imgscrpr Settings");
        embed.setColor("#d62e00");

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
        // Move to different commands
        if(['🔺', '🔻'].includes(reaction.emoji.name)) {
            if(reaction.emoji.name == '🔺') {
                // Make sure index is positive
                index = (index + Object.keys(settings).length - 1) % Object.keys(settings).length;
            } else {
                index = (index + 1) % Object.keys(settings).length;
            }
            await response.edit({ embeds: [await make_embed(index)] });
            await response.reactions.resolve(reaction.emoji.name).users.remove(user.id);
            return;
        }

        // User must be admin to allow for changes
        if(
            Channel.channel.administrators.users.includes(msg.author.id)
            || msg.member.roles.cache.hasAny(...Channel.channel.administrators.roles)
            || msg.member.permissions.has("ADMINISTRATOR")
        ) {
            await settings[Object.keys(settings)[index]][2](response);
            await response.edit({ embeds: [await make_embed(index)] }).catch(() => /* ok? dont care? */{});
        }

        // Remove reaction to allow for repeated reactions
        await response.reactions.resolve(reaction.emoji.name).users.remove(user.id).catch(() => /* ok? dont care? */{});
    });

    // At end of 2 minutes update database
    Collector.on('end', async () => {
        await response.delete().catch(() => /* ok? dont care? */{});
        await msg.delete().catch(() => /* ok? dont care? */{});
    });
}