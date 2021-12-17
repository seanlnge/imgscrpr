import { Client, GetChannel, UpdateChannel } from "../../../database/preference";
import * as Discord from "discord.js";
import { SubredditScore } from "../../../scraper/subreddits";

type User = {
    subscriptions: { [key: string]: string }[],
    unix: number;
}

export async function UpdateUser(user_id: string, data: { [key: string]: string }[]) {
    const user = await Client.db("premium").collection(user_id).findOne();
    if(user) {
        // Move any previous subscriptions into new data
        data = data.map(curr => {
            let index = user.subscriptions.findIndex(a => curr.type == a.type && a.guild_id);
            if(index == -1) return curr;
            return user.subscriptions.splice(index, 1)[0];
        });

        // Remove premium from other subscriptions
        for(const subscription of user.subscriptions) {
            if(!subscription.guild_id) continue;

            if(subscription.type == "server") {
                await Client.db("servers").collection(subscription.guild_id).updateOne(
                    { premium: { $eq: true } }, { $set: { premium: false }}
                );
            } else if(subscription.type == "channel") {
                const Channel = await GetChannel(subscription.guild_id, subscription.channel_id);
                Channel.channel.premium = false;
                await UpdateChannel(subscription.guild_id, subscription.channel_id);
            }
        }
        user.subscriptions = data;
        
        return await Client.db("premium").collection(user_id).updateOne({}, { $set: user });
    }

    return await Client.db("premium").collection(user_id).insertOne({
        subscriptions: data,
        unix: Date.now()
    });
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

    HelpMessage.forEach(({ command, description }) => embed.addField(command, description));

    await msg.reply({ embeds: [embed] });
}

export async function Display(msg: Discord.Message) {
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    embed.setTitle(`${msg.author.username}'s Imgscrpr Premium`);
    
    const { subscriptions, unix } = await GetUser(msg);
    if(!subscriptions || !unix) return await msg.reply("Your premium isn't setup yet");

    embed.setDescription(`Member since ${(new Date(unix)).toDateString().slice(4)}\n⠀`);

    const active_channels = subscriptions.reduce((a, c) => a + (c.id ? 1 : 0), 0);
    embed.addField("Number of Subscriptions", subscriptions.length.toString());
    embed.addField("Active Subscriptions", active_channels.toString());
    embed.addField("Inactive Subscriptions", (subscriptions.length - active_channels).toString());

    // List IDs of channels/servers that have premium
    embed.addField("Subscription IDs", subscriptions.reduce((a, c) =>
        `${a}\n${c.type=='channel'?'__Channel__ - '+(c.channel_id||'Inactive'):'__Server__ - '+(c.guild_id||'Inactive')}`
    , '') + '⠀'); // formatting
    await msg.reply({ embeds: [embed] });
}

export async function Add(msg: Discord.Message, options: string[]) {
    if(options.length > 1) return await msg.reply(`These other arguments don't do anything: ${options.slice(1).join(', ')}`);
    if(options.length == 0) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium add channel|server`");

    const User = await GetUser(msg);

    if(options[0] == "server") {
        if(!User.subscriptions.some(a => !a.guild_id && a.type == "server")) {
            return await msg.reply("You have used all of your premium server slots! Either remove a server or upgrade your subscription tier");
        }

        if((await Client.db("servers").collection(msg.guildId).findOne({ premium: { $eq: true } }))) {
            return await msg.reply("This server is already premium");
        }
        User.subscriptions.find(a => a.type == "server" && !a.guild_id).guild_id = msg.guildId;

        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
        await Client.db("servers").collection(msg.guildId).updateOne(
            { premium: { $eq: false } },
            { $set: { premium: true }},
            { upsert: true }
        );

        return await msg.reply("Successfully added this server to premium");
    } else {
        if(!User.subscriptions.some(a => !a.channel_id && a.type == "channel")) {
            return await msg.reply("You have used all of your premium channel slots! Either remove a channel or upgrade your subscription tier");
        }

        const Channel = await GetChannel(msg.guildId, msg.channelId);
        if(Channel.channel.premium) {
            return await msg.reply("That channel is already premium");
        }
        let data = User.subscriptions.find(a => a.type == "channel" && !a.channel_id);
        data.guild_id = msg.guildId;
        data.channel_id = msg.channelId;
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
        if(!User.subscriptions.find(a => a.type == "server" && a.guild_id == msg.guildId)) {
            return await msg.reply("You haven't set this server to premium");
        }

        User.subscriptions.find(a => a.type == "server" && a.guild_id == msg.guildId).guild_id = undefined;

        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
        await Client.db("servers").collection(msg.guildId).updateOne({ premium: { $eq: true } }, { $set: { premium: false }});

        return await msg.reply(`Successfully removed this server from premium`);
    } else {
        if(!User.subscriptions.find(a => a.type == "channel" && a.channel_id == msg.channelId)) {
            return await msg.reply("You haven't set this channel to premium");
        }

        let data = User.subscriptions.find(a => a.type == "channel" && a.channel_id == msg.channelId)
        data.guild_id = undefined;
        data.channel_id = undefined;
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

export async function Reactions(msg: Discord.Message, options: string[]) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const reactions = Channel.channel.reactions;

    const make_embed = async (index: number) => {
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
        embed.setTitle("Message Reactions for #" + channel_name);
        embed.setDescription("Each reaction has a score attached which provides feedback to Imgscrpr, ultimately providing a better experience with future posts. ");

        for(const reaction in reactions) {
            let name = (Object.keys(reactions)[index] == reaction ? ':arrow_right: ' : ':black_large_square: ') + '⠀' + reaction;
            let value = reactions[reaction];
            embed.addField(`${name}  ${value > 0 ? '+' + value : value}`, '⠀');
        }
        let emoji = index == Object.keys(reactions).length ? ':arrow_right: ' : ':black_large_square: ';
        embed.addField(emoji + '⠀Done', '⠀');
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
                index = (index + Object.keys(reactions).length - 1) % (Object.keys(reactions).length+1);
            } else {
                index = (index + 1) % (Object.keys(reactions).length+1);
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
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    
}