import { Client, GetChannel } from "../../../database/preference";
import * as Discord from "discord.js";
import { SubredditConnections, SubredditScore } from "../../../scraper/subreddits";

export async function ChannelIsPremium(server_id: string, channel_id: string): Promise<boolean> {
    if((await GetChannel(server_id, channel_id)).channel.premium) return true;
    if(await Client.db("servers").collection(server_id).findOne({ premium: { $eq: true }})) return true;
    return false;
}

export async function UserIsPremium(id: string): Promise<boolean> {
    return (await Client.db("premium").listCollections().toArray()).some(a => a.name == id)
}

type User = {
    subscriptions: { [key: string]: string }[],
    unix: number;
}

export async function GetUser(msg: Discord.Message): Promise<User> {
    const id = msg.author.id;
    const premium = Client.db("premium");

    if(await UserIsPremium(id)) {
        return await premium.collection(id).findOne({}) as User;
    }
}

const HelpMessage = [
    { name: 'display', command: "i.premium display", description: "Display information about your premium subscription", full: "Display the join date and premium communities that are in your premium subscription" },
    { name: 'list', command: "i.premium list", description: "View and edit the active communities tied to your premium subscription", full: "Open up the panel to view and edit the active communities tied to your premium subscription" },
    { name: 'add', command: "i.premium add channel|server {id}?", description: "Add Imgscrpr premium to a Discord channel or server", full: "Set a Discord channel or server to premium, if the id parameter is not provided, it will add the channel or server being typed in" },
    { name: 'remove', command: "i.premium remove channel|server {id}?", description: "Remove Imgscrpr premium from a Discord channel or server", full: "Remove a Discord channel or server from premium, if the id parameter is not provided, it will add the channel or server being typed in" }
];

export async function Help(msg: Discord.Message, options: string[]) {
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });

    // Detailed help message for particular command
    if(options.length > 1) {
        if(options[0] != "help") return await msg.reply(`"${options[0]}" is not a premium command`).catch(() => undefined);
        let command = HelpMessage.find(a => a.name == options[1]);
        if(!command) return await msg.reply(`"${options[1]}" is not a premium command`).catch(() => undefined);
        if(options.length != 2) return await msg.reply(`These arguments do not do anything: ${options.slice(2).join(', ')}`).catch(() => undefined);

        embed.setTitle(command.command);
        embed.setDescription(command.full);
    }
    
    // Default help message
    else {
        embed.setTitle("Imgscrpr Premium Commands");
        embed.setDescription("Thank you so much for buying Imgscrpr premium. It means a lot that you are willing to support us. Join our [support server](https://discord.gg/wx8UfHQr48) if you have any questions whatsoever, and enjoy premium!");
        HelpMessage.forEach(({ command, description }) => embed.addField('⠀', `**\`${command}\`** - ${description}`));
        embed.addField('\n⠀', 'Type `i.help {command}` for a detailed explanation\n[Add Imgscrpr to your Discord server!](https://discord.com/api/oauth2/authorize?client_id=904018497657532447&permissions=532576463936&scope=bot)');
    }
    await msg.reply({ embeds: [embed] }).catch(() => undefined);
}

export async function Display(msg: Discord.Message) {
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    embed.setTitle(`${msg.author.username}'s Imgscrpr Premium`);
    
    const { subscriptions, unix } = await GetUser(msg);
    if(!subscriptions || !unix) return await msg.reply("Your premium isn't setup yet").catch(() => undefined);

    embed.setDescription(`Member since ${(new Date(unix)).toDateString().slice(4)}\n`);

    const active_channels = subscriptions.reduce((a, c) => a + (c.guild_id ? 1 : 0), 0);
    embed.addField("Unused Premium Slots", (subscriptions.length - active_channels).toString(), true);
    embed.addField("Active Premium Slots", active_channels.toString(), true);

    await msg.reply({ embeds: [embed] }).catch(() => undefined);
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

    return await msg.reply({ embeds: [embed] }).catch(() => undefined);
}

export async function Subreddits(msg: Discord.Message, options: string[]) {
    const amount_str = options[0] || "5";
    if(options.length > 1) return await msg.reply(`These other arguments don't do anything: ${options.slice(1).join(', ')}`).catch(() => undefined);

    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });

    const channel_name = msg.guild.channels.cache.get(msg.channelId).name;
    embed.setTitle(`Top Subreddits for #${channel_name}`);
    
    const amount = parseInt(amount_str);
    if(isNaN(amount)) return await msg.reply(`"${amount_str}" is not a number`).catch(() => undefined);

    // A set doesn't allow repeated items
    const subreddits: Set<string> = new Set();
    for(let sub in Channel.subreddits) {
        subreddits.add(sub);
        SubredditConnections(sub).forEach(a => subreddits.add(a));
    }
    
    const sub_scores = Array.from(subreddits).map(async x => {
        return { subreddit: x, score: await SubredditScore(msg.guildId, msg.channelId, x) };
    });
    const top_subs = (await Promise.all(sub_scores)).sort((a, b) => b.score - a.score).slice(0, amount);

    for(const sub of top_subs) {
        embed.addField(`r/${sub.subreddit}`, sub.score.toPrecision(3));
    }
    return await msg.reply({ embeds: [embed] }).catch(() => undefined);
}