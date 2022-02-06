import * as Discord from 'discord.js'
import { GetChannel, UpdateChannel } from '../../../database/preference';
import { SubredditConnections } from '../../../scraper/subreddits';
import { UserIsAdmin } from '../dynamic/permissions';
import { SendPost } from '../dynamic/send';
import { ChannelIsPremium } from './static';

export async function Presets(msg: Discord.Message, options: string[], name?: string) {
    if(name) {
        switch(options[0]) {
            case 'delete': return await DeletePreset(msg, name, options.slice(1));
            case 'edit': return await EditPreset(msg, name, options.slice(1));
            case 'add': return await AddToPreset(msg, name, options.slice(1));
            case 'enhance': return await EnhancePreset(msg, name, options.slice(1));
            default: return await SendPreset(msg, name, options.slice(1));
        }
    }
    switch(options[0]) {
        case 'create': return await CreatePreset(msg, options.slice(1));
        case 'list': return await ListPresets(msg, options.slice(1));
    }

    // help message
    const embed = new Discord.MessageEmbed({ color: "#d62e00"});
    embed.setTitle("Presets Help");
    embed.setDescription("Presets are a way to allow users to send posts from a particular few subreddits, such as memes, or animals, or news. When a preset is created, you can add however many subreddits wanted, and a custom command will be created.\n\u2800");
    embed.addField("`i.preset create {name}`", "Creates a preset with a name that cannot be any of the default Imgscrpr commands. This will also create a custom command dedicated to that preset");
    embed.addField("`i.preset list`", "Lists the names of all presets in the server, as well as their subreddit count");
    embed.addField("`i.{preset}`", "Sends a post from a randomly chosen subreddit in your preset");
    embed.addField("`i.{preset} add {subreddit}`", "Adds a subreddit to your preset");
    embed.addField("`i.{preset} enhance`", "Adds similar subreddits to the preset");
    embed.addField("`i.{preset} edit`", "Shows a list of all subreddits in your preset, as well as a GUI for removing them");
    embed.addField("`i.{preset} delete`", "Deletes the preset, as well as removing the custom command");
    return await msg.channel.send({ embeds: [embed] }).catch(() => undefined);
}

// Unnamed
async function CreatePreset(msg: Discord.Message, options: string[]) {
    if(!UserIsAdmin(msg, msg.author)) return await msg.reply(`You need to be an admin!`);
    if(!options.length) return await msg.reply("You need to input a preset name! `i.preset create {name}`").catch(() => undefined);
    if(options.length > 1) return await msg.reply(`These options do not do anything: ${options.slice(1).join(', ')}`).catch(() => undefined);

    if(!/^[a-z0-9]+$/i.test(options[0])) return await msg.reply(`Preset names need to be alphanumeric!`);

    const Channel = await GetChannel(msg.guildId, msg.channelId);
    if(options[0] in Channel.channel.presets) return await msg.reply(`The preset ${options[0]} already exists`).catch(() => undefined);
    if(!ChannelIsPremium(msg.guildId, msg.channelId) && Object.keys(Channel.channel.presets).length >= 3) return await msg.reply(`You need premium to create more than 3 channel presets!`)
    Channel.channel.presets[options[0]] = [];
    
    await UpdateChannel(msg.guildId, msg.channelId);
    return await msg.reply(`Successfully created preset '${options[0]}'`).catch(() => undefined);
}

async function ListPresets(msg: Discord.Message, options: string[]) {
    if(options.length) return await msg.reply(`These options don't do anything: ${options.join(', ')}`).catch(() => undefined);

    const Channel = await GetChannel(msg.guildId, msg.channelId);
    
    const embed = new Discord.MessageEmbed({ color: "#d62e00"});
    const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
    embed.setTitle("Presets for #" + channel_name);
    for(let preset in Channel.channel.presets) {
        embed.addField(preset, Channel.channel.presets[preset].length + ' subreddits');
    }

    return await msg.channel.send({ embeds: [embed] }).catch(() => undefined);    
}


// Named
async function AddToPreset(msg: Discord.Message, name: string, options: string[]) {
    if(!UserIsAdmin(msg, msg.author)) return await msg.reply(`You need to be an admin!`);
    if(options.length > 1) return await msg.reply(`These options do not do anything: ${options.slice(1).join(', ')}`).catch(() => undefined);

    if(!/^[a-z0-9]+$/i.test(options[0])) return await msg.reply(`Subreddit names need to be alphanumeric!`);
    if(["add", "reset", "send", "settings", "admin", "preset", "stats", "subreddits", "reactions", "premium", "help", "info", "upgrade"].includes(options[0])) return await msg.reply("Preset names cannot be the same as default Imgscrpr names!");

    const Channel = await GetChannel(msg.guildId, msg.channelId);

    const subreddit = options[0].replace(/(r\/|\/)/g, ""); // remove r/ or /r/
    Channel.channel.presets[name].push(subreddit);

    await UpdateChannel(msg.guildId, msg.channelId);
    return await msg.reply(`Successfully added r/${subreddit} to preset '${name}'`);
}

async function DeletePreset(msg: Discord.Message, name: string, options: string[]) {
    if(!UserIsAdmin(msg, msg.author)) return await msg.reply(`You need to be an admin!`);
    if(options.length) return await msg.reply(`These options do not do anything: ${options.join(', ')}`).catch(() => undefined);

    const Channel = await GetChannel(msg.guildId, msg.channelId);
    delete Channel.channel.presets[name];

    await UpdateChannel(msg.guildId, msg.channelId);
    return await msg.reply(`Successfully delete preset '${name}'`).catch(() => undefined);
}

async function SendPreset(msg: Discord.Message, name: string, options: string[]) {
    if(options.length) return await msg.reply(`These options do not do anything: ${options.join(', ')}`).catch(() => undefined);

    const Channel = await GetChannel(msg.guildId, msg.channelId);

    const preset = Channel.channel.presets[name];
    if(preset.length == 0) return await msg.reply(`The preset '${name}' does not contain any subreddits!`).catch(() => undefined);
    const subreddit = preset[Math.floor(Math.random()*preset.length)];

    await SendPost(msg, [subreddit]);
}

async function EditPreset(msg: Discord.Message, name: string, options: string[]) {
    if(!UserIsAdmin(msg, msg.author)) return await msg.reply(`You need to be an admin!`);
    if(options.length) return await msg.reply(`These options do not do anything: ${options.join(', ')}`).catch(() => undefined);

    const Channel = await GetChannel(msg.guildId, msg.channelId);
    if(!UserIsAdmin(msg, msg.author.id)) return await msg.reply("You need to be an administrator to edit settings!").catch(() => undefined);

    const make_embed = async (index: number) => {
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
        embed.setTitle("Imgscrpr Settings for #" + channel_name);
        embed.setDescription("These settings allow you to change what Imgscrpr sends, as well as some other channel-wide preferences\n\u2800");

        let indexed = Channel.channel.presets[name][index];
        for(const subreddit of Channel.channel.presets[name]) {
            embed.addField((indexed == subreddit ? ':x: ' : ':black_large_square: ') + subreddit, '\u2800');
        }
        embed.addField((index == Channel.channel.presets[name].length ? ':arrow_right: ' : ':black_large_square: ') + 'Done', '\u2800');
        
        return embed;
    }

    let index = 0;
    const response = await msg.channel.send({ embeds: [await make_embed(index)] }).catch(() => undefined);
    if(!response) return;
    await response.react("🔺").catch(() => undefined);
    await response.react("🔻").catch(() => undefined);
    await response.react("↔️").catch(() => undefined);

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
        if(['🔺', '🔻'].includes(reaction.emoji.name)) {
            // Modulo to wrap around
            if(reaction.emoji.name == '🔻') index = (index + 1) % (Channel.channel.presets[name].length + 1);
            
            // Make sure index is positive when modulo-ing
            else index = (index + Channel.channel.presets[name].length) % (Channel.channel.presets[name].length + 1)

            // Remove reaction to allow for repeated reactions
            await response.edit({ embeds: [await make_embed(index)] }).catch(() => /* ok? dont care? */{});
            await response.reactions.resolve(reaction.emoji.name).users.remove(user.id).catch(() => /* ok? dont care? */{});
            return;
        }
        
        if(index == Channel.channel.presets[name].length) {
            await UpdateChannel(msg.guildId, msg.channelId);
            await response.delete().catch(() => /* ok? dont care? */{});
            await msg.delete().catch(() => /* ok? dont care? */{});
            return;
        }
        Channel.channel.presets[name].splice(index, 1);
        
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

async function EnhancePreset(msg: Discord.Message, name: string, options: string[]) {
    if(!UserIsAdmin(msg, msg.author)) return await msg.reply(`You need to be an admin!`);
    if(options.length) return await msg.reply(`These options do not do anything: ${options.join(', ')}`).catch(() => undefined);

    const Channel = await GetChannel(msg.guildId, msg.channelId);

    // For each subreddit, find a connection that isn't in set
    const set = new Set();
    for(const subreddit of Channel.channel.presets[name]) {
        set.add(subreddit);
        const connections = SubredditConnections(subreddit);
        let found = connections.find(a => !set.has(a));
        if(found) set.add(found);
    }
    Channel.channel.presets[name] = Array.from(set);

    await UpdateChannel(msg.guildId, msg.channelId);
    return await msg.reply(`Successfully enhanced the preset '${name}'`)
}