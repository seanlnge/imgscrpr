import * as Discord from 'discord.js';
import { GetChannel } from '../../database/preference';

const HelpMessage = {
    "send": [".i ~", "Send an image/video"],
    "reset": [".i ~", "Reset channel preferences"],
    "add": [".i ~ subreddit", "Add a subreddit to top of feed"],
    "remove": [".i ~ subreddit", "Remove a subreddit from top of feed"]
};


export async function SendHelpMessage(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);
    const embed = new Discord.MessageEmbed();
    embed.setTitle("Imgscrpr Commands");
    embed.setColor("#d62e00");
    for(let command in HelpMessage) {
        let data = HelpMessage[command];
        embed.addField(
            data[0].replace("~", Channel.channel.commands[command]),
            data[1]
        );
    }
    await msg.reply({ embeds: [embed] });
}


export async function SendPremiumMessage(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);
    if(Channel.channel.premium) {
        msg.reply("Thanks for buying it!")
    }
    
    const embed = new Discord.MessageEmbed();
    embed.setTitle("Imgscrpr Premium");
    embed.setColor("#d62e00");
    embed.setURL("https://www.patreon.com/imgscrpr");
    embed.setThumbnail("https://i.imgur.com/BdjBe41.png");
    embed.setDescription("Premium removes long rate limits and adds many perks. It amplifies your experience greatly, and also supports us in hosting Imgscrpr and creating a better experience for everyone.");
    embed.addField("Tiny Rate Limit", "Changes the waiting time between posts from 60 seconds to 2 seconds");
    embed.addField("Customizable Votes", "Gives the ability to edit the upvote/downvote reactions, as well as adding new ones");
    embed.addField("Change Commands", "Allows you to not only rename commands, but also to make new ones");
    embed.setFooter("Although buying premium enhances your channel's experience as well as supporting us, it isn't necessary, and we will still appreciate you regardless");
    await msg.reply({ embeds: [embed] });

    Channel.channel.premium = true;
}