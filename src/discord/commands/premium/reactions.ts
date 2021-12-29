import * as Discord from 'discord.js';
import { GetChannel, UpdateChannel } from "../../../database/preference";

/**
 * Open the score reaction panel
 * @param msg Discord message object
 * @param score Score to append to reaction emoji
 */
 async function add_reaction(msg: Discord.Message, score: number) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const reactions = Channel.channel.reactions;

    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    embed.setTitle("Add Scoring Reaction in #" + msg.guild.channels.cache.get(msg.channelId).name);
    embed.setDescription("React to this message embed with your desired reaction");
    embed.addField("Score", score.toString());
    const response = await msg.reply({ embeds: [embed] });
    
    const Collector = response.createReactionCollector({
        time: 120000,
        dispose: true
    });
    Collector.on("collect", async (reaction, user) => {
        // User must be admin to allow for changes
        const member = msg.guild.members.cache.find(a => a.id == msg.author.id);
        if(
            !Channel.channel.administrators.users.includes(user.id)
            && !member.roles.cache.hasAny(...Channel.channel.administrators.roles)
            && !member.permissions.has("ADMINISTRATOR")
        ) return;

        reactions[reaction.emoji.name] = score;
        await msg.delete();
        await response.delete();
        await UpdateChannel(msg.guildId, msg.channelId);
    });
    Collector.on("end", async () => {
        if(msg.deletable) await msg.delete().catch(() => /* ok? dont care? */{});
        if(response.deletable) await response.delete().catch(() => /* ok? dont care? */{});
    });
}

/**
 * List all reactions in a certain channel
 * @param msg Discord message object
 */
async function list_reactions(msg: Discord.Message) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const reactions = Channel.channel.reactions;

    // User must be admin to allow for changes
    const member = msg.guild.members.cache.find(a => a.id == msg.author.id);
    if(
        !Channel.channel.administrators.users.includes(msg.author.id)
        && !member.roles.cache.hasAny(...Channel.channel.administrators.roles)
        && !member.permissions.has("ADMINISTRATOR")
    ) return;

    // Function called on editing function
    const make_embed = (index: number) => {
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
        embed.setTitle("Message Reactions for #" + channel_name);
        embed.setDescription("Each reaction has a score attached which provides feedback to Imgscrpr, ultimately providing a better experience with future posts. ");

        for(const reaction in reactions) {
            let name = (Object.keys(reactions)[index] == reaction ? ':x: ' : ':black_large_square: ') + '⠀' + reaction;
            let value = reactions[reaction];
            embed.addField(`${name}  ${value > 0 ? '+' + value : value}`, '⠀');
        }
        let emoji = index == Object.keys(reactions).length ? ':arrow_right: ' : ':black_large_square: ';
        embed.addField(emoji + '⠀Done', '⠀');

        return embed;
    }

    let index = 0;
    const response = await msg.channel.send({ embeds: [make_embed(index)] });

    // React with interactive panel
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
        if(user.id != msg.author.id) return;

        // Move to different commands
        let keys = Object.keys(reactions);
        if(['🔺', '🔻'].includes(reaction.emoji.name)) {
            if(reaction.emoji.name == '🔺') {
                // Make sure index is positive
                index = (index + keys.length) % (keys.length+1);
            } else {
                index = (index + 1) % (keys.length+1);
            }

            // Edit message and delete reaction
            await response.edit({ embeds: [make_embed(index)] });
            await response.reactions.resolve(reaction.emoji.name).users.remove(user.id);
            return;
        }

        if(index == keys.length) {
            await msg.delete();
            await response.delete();
        } else {
            delete reactions[keys[index]];
            keys.splice(index, 1);
            await UpdateChannel(msg.guildId, msg.channelId);
        }

        // Edit message and delete reaction
        await response.edit({ embeds: [make_embed(index)] }).catch(() => /* ok? dont care? */{});
        await response.reactions.resolve(reaction.emoji.name).users.remove(user.id).catch(() => /* ok? dont care? */{});
    });

    // At end of 2 minutes delete messages
    Collector.on('end', async () => {
        await response.delete().catch(() => /* ok? dont care? */{});
        await msg.delete().catch(() => /* ok? dont care? */{});
    });
}

export async function Reactions(msg: Discord.Message, options: string[]) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);

    // If attempting to add a reaction, take to separate function
    if(options[0] == "add") {
        // User must be admin to allow for changes
        const member = msg.guild.members.cache.find(a => a.id == msg.author.id);
        if(
            !Channel.channel.administrators.users.includes(msg.author.id)
            && !member.roles.cache.hasAny(...Channel.channel.administrators.roles)
            && !member.permissions.has("ADMINISTRATOR")
        ) return await msg.reply("You need to be an administrator to edit reactions!");

        if(!options[1]) return await msg.reply("The proper command to add a reaction is `i.reactions add {score}`");
        let score = parseFloat(options[1]);
        if(isNaN(score)) return await msg.reply(`"${options[1]}" is not a valid score`);
        return await add_reaction(msg, score);
    }

    if(options.length) {
        return await msg.reply(`These arguments don't do anything: "${options.join(', ')}"`);
    }
    return await list_reactions(msg);
}