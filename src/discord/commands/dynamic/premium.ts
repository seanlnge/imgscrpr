import { Client, GetChannel, UpdateChannel } from "../../../database/preference";
import * as Discord from "discord.js";
import { SubredditScore } from "../../../scraper/subreddits";

type User = {
    subscriptions: { type: string, id: string }[],
    unix: number;
}

export async function ChannelIsPremium(server_id: string, channel_id: string): Promise<boolean> {
    if((await GetChannel(server_id, channel_id)).channel.premium) return true;
    if(await Client.db("servers").collection(server_id).findOne({ premium: { $eq: true }})) return true;
    return false;
}
export async function UserIsPremium(id: string): Promise<boolean> {
    return (await Client.db("premium").listCollections().toArray()).some(a => a.name == id)
}
async function GetUser(msg: Discord.Message): Promise<User> {
    const id = msg.author.id;
    const premium = Client.db("premium");

    if(await UserIsPremium(id)) {
        return await premium.collection(id).findOne({}) as User;
    }
}

const HelpMessage = [
    { command: "`i.premium display`", description: "Display information about your premium subscription" },
    { command: "`i.premium add channel|server`", description: "Add Imgscrpr premium to this Discord channel or server" },
    { command: "`i.premium remove channel|server`", description: "Remove Imgscrpr premium from this Discord channel or server" }
];

export async function Help(msg: Discord.Message) {
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    embed.setTitle("Imgscrpr Premium Commands");
    embed.setDescription("Thank you so much for buying Imgscrpr premium. It means a lot that you are willing to support us. Join our [support server](https://discord.gg/wx8UfHQr48) if you have any questions whatsoever, and enjoy premium!");

    HelpMessage.forEach(({ command, description }) => {
        embed.addField(command, description);
    });

    await msg.reply({ embeds: [embed] });
}

export async function Display(msg: Discord.Message) {
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    embed.setTitle(`${msg.author.username}'s Imgscrpr Premium`);
    
    const { subscriptions, unix } = await GetUser(msg);
    if(!subscriptions || !unix) return await msg.reply("Your premium isn't setup yet");

    embed.setDescription(`Member since ${(new Date(unix)).toDateString().slice(4)}`);

    const active_channels = subscriptions.reduce((a, c) => a + (c.id ? 1 : 0), 0);
    embed.addField("Number of Subscriptions", subscriptions.length.toString());
    embed.addField("Active Subscriptions", active_channels.toString());
    embed.addField("Inactive Subscriptions", (subscriptions.length - active_channels).toString());

    // List IDs of channels/servers that have premium
    embed.addField("Subscription IDs", subscriptions.reduce((a, c) =>
        `${a}\n${c.type=='channel'?'Channel':'Server'}: ${c.id || 'Inactive'}`
    , '')); // formatting
    await msg.reply({ embeds: [embed] });
}

export async function Add(msg: Discord.Message, options: string[]) {
    if(options.length > 1) return await msg.reply(`These other arguments don't do anything: ${options.slice(1).join(', ')}`);
    if(options.length == 0) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium add channel|server`");

    const User = await GetUser(msg);

    if(options[0] == "server") {
        if(!User.subscriptions.some(a => !a.id && a.type == "server")) {
            return await msg.reply("You have used all of your premium server slots! Either remove a server or upgrade your subscription tier");
        }

        if((await Client.db("servers").collection(msg.guildId).findOne({ premium: { $eq: true } }))) {
            return await msg.reply("This server is already premium");
        }
        User.subscriptions.find(a => a.type == "server" && !a.id).id = msg.guildId;

        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
        await Client.db("servers").collection(msg.guildId).updateOne(
            { premium: { $eq: true } },
            { $set: { premium: true }},
            { upsert: true }
        );

        return await msg.reply("Successfully added this server to premium");
    } else {
        if(!User.subscriptions.some(a => !a.id && a.type == "channel")) {
            return await msg.reply("You have used all of your premium channel slots! Either remove a channel or upgrade your subscription tier");
        }

        const Channel = await GetChannel(msg.guildId, msg.channelId);
        if(Channel.channel.premium) {
            return await msg.reply("That channel is already premium");
        }
        User.subscriptions.find(a => a.type == "channel" && !a.id).id = msg.channelId;
        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });

        Channel.channel.premium = true;
        await UpdateChannel(msg.guildId, msg.channelId);
    }

    return await msg.reply(`Successfully added <#${msg.channelId}> to premium`);
}

export async function Remove(msg: Discord.Message, options: string[]) {
    if(options.length > 1) return await msg.reply(`These other arguments don't do anything: ${options.slice(1).join(', ')}`);
    if(options.length == 0) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium remove channel|server`");

    const User = await GetUser(msg);

    if(options[0] == "server") {
        if(!User.subscriptions.find(a => a.type == "server" && a.id == msg.guildId)) {
            return await msg.reply("You haven't set this server to premium");
        }

        User.subscriptions.find(a => a.type == "server" && a.id == msg.guildId).id = undefined;

        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
        await Client.db("servers").collection(msg.guildId).updateOne({ premium: { $eq: true } }, { $set: { premium: false }});

        return await msg.reply(`Successfully removed this server from premium`);
    } else {
        if(!User.subscriptions.find(a => a.type == "channel" && a.id == msg.channelId)) {
            return await msg.reply("You haven't set this channel to premium");
        }

        User.subscriptions.find(a => a.type == "channel" && a.id == msg.channelId).id = undefined;
        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });

        const Channel = await GetChannel(msg.guildId, msg.channelId);
        Channel.channel.premium = false;
        await UpdateChannel(msg.guildId, msg.channelId);

        return await msg.reply(`Successfully removed <#${msg.channelId}> from premium`);
    }
}

export async function Stats(msg: Discord.Message) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const Statistics = Channel.statistics;

    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
    embed.setTitle(`Statistics for #${channel_name}`);

    embed.addField("Posts", Statistics.posts.toString(), true);
    embed.addField("Votes", Statistics.votes.toString(), true);

    let avg_score = Statistics.score / Statistics.posts;
    embed.addField("Average Score", avg_score.toString());

    let score_ratio = Statistics.score / Statistics.votes;
    embed.addField("Score/Votes Ratio", score_ratio.toString());

    return await msg.reply({ embeds: [embed] });
}

export async function List(msg: Discord.Message, options: string[]) {
    const amount_str = options[0] || "5";
    if(options.length > 1) return await msg.reply(`These other arguments don't do anything: ${options.slice(1).join(', ')}`);

    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });

    const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
    embed.setTitle(`Top Subreddits for #${channel_name}`);
    
    const amount = parseInt(amount_str);
    if(isNaN(amount)) return await msg.reply(`"${amount_str}" is not a number`);

    const sub_scores = Object.keys(Channel.subreddits).map(async x => {
        return { subreddit: x, score: await SubredditScore(msg.guildId, msg.channelId, x) };
    });
    const top_subs = (await Promise.all(sub_scores)).sort((a, b) => b.score - a.score).slice(0, amount);

    for(const sub of top_subs) {
        embed.addField(`r/${sub.subreddit}`, sub.score.toPrecision(3));
    }
    return await msg.reply({ embeds: [embed] });
}