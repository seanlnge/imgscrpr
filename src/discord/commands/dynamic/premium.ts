import { Client, GetChannel } from "../../../database/preference";
import * as Discord from "discord.js";

const roles = {
    "1": 1,
    "2": 3,
    "3": 8
};

export async function IsPremium(id: string): Promise<boolean> {
    return (await Client.db("premium").listCollections().toArray()).some(a => a.name == id)
}
async function GetUser(msg: Discord.Message): Promise<{ maximum: number, channels: string[], unix: number }> {
    const id = msg.author.id;
    /* 
    "user": [
        { "joined": number } // unix timestamp
        { "channels":
            {
                "maximum": number // total channels for their plan
                "ids": string[] // list of channel ids
            }
        }
    ]
    */

    const premium = Client.db("premium");

    if(await IsPremium(id)) {
        return await premium.collection(id).findOne({}) as { maximum: number, channels: string[], unix: number };
    } else {
        let data = {
            channels: [],
            maximum: roles[msg.member.roles.highest.id] || 1,
            unix: Date.now()
        };
        await premium.collection(id).insertOne(data);
        return data;
    }
}

const HelpMessage = [
    { command: "`i.premium display`", description: "Display information about your premium subscription" },
    { command: "`i.premium add {channel_id}`", description: "Add Imgscrpr premium to a Discord channel" },
    { command: "`i.premium remove {channel_id}`", description: "Remove Imgscrpr premium from a Discord channel" }
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
    
    const { maximum, channels, unix } = await GetUser(msg);
    if(!maximum || !channels || !unix) return await msg.reply("Your premium isn't setup yet");

    embed.setDescription(`Member since ${(new Date(unix)).toDateString().slice(4)}`);

    embed.addField("Available Channels", maximum.toString());
    embed.addField("Active Channels", channels.length.toString());
    embed.addField("Inactive Channels", (maximum - channels.length).toString());

    embed.addField("Channel IDs", channels.reduce((a, c) => a + '\n  ' + c, '') || 'No channels added yet');

    await msg.reply({ embeds: [embed] });
}

export async function Add(msg: Discord.Message, channel: string) {
    const User = await GetUser(msg);
    if(!channel) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium add {channel_id}`");

    if(User.maximum - User.channels.length < 0) {
        return await msg.reply("You have used all of your premium channel slots! Either remove a channel or upgrade your subscription tier");
    }

    if(User.channels.includes(channel)) {
        return await msg.reply("That channel is already premium");
    }
    User.channels.push(channel);
    Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
}

export async function Remove(msg: Discord.Message, channel: string) {
    const User = await GetUser(msg);
    if(!channel) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium add {channel_id}`");

    if(!User.channels.includes(channel)) {
        return await msg.reply("That channel isn't premium right now");
    }

    User.channels = User.channels.filter(a => a != channel);
    Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
}

export async function Stats(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);
    const Statistics = Channel.statistics;

    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    let channel_name = msg.guild.channels.cache.get(msg.channelId).name;

    embed.setTitle(`Statistics for #${channel_name}`);
    embed.addField("Posts", Statistics.posts.toString(), true);
    embed.addField("Votes", Statistics.votes.toString(), true);

    let avg_score = Statistics.score / Statistics.posts;
    embed.addField("Average Score", avg_score.toString());

    let score_ratio = Statistics.score / Statistics.votes;
    embed.addField("Score/Votes Ratio", score_ratio.toString());

    return await msg.reply({ embeds: [embed] });
}