import * as Discord from 'discord.js';
import { GetChannel } from '../../database/preference';

const HelpMessage = {
    "send": ["`i.~ [subreddit]`", "Send an image/video"],
    "reset": ["`i.~`", "Reset subreddit preferences"],
    "add": ["`i.~ subreddit`", "Add a subreddit to top of feed"],
    "remove": ["`i.~ subreddit`", "Remove a subreddit from top of feed"],
    "settings": ["`i.~`", "Open up the settings panel"],
    "admin": ["`i.~ 'add'|'remove' user|role`", "Give/revoke administrator access to user/role"]
};


export async function SendHelpMessage(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);
    const embed = new Discord.MessageEmbed();
    embed.setTitle("Imgscrpr Commands");
    embed.setColor("#d62e00");
    embed.setDescription("Mobile typing sucks, so Imgscrpr responds to both uppercase and lowercase, as well as accepting extra spaces ('I. help' works). Brackets mean that the parameter is optional, but otherwise it is necessary, and the '|' symbols means to choose either side\n")
    for(let command in HelpMessage) {
        let data = HelpMessage[command];
        embed.addField(
            data[0].replace("~", Channel.channel.commands[command]),
            data[1]
        );
    }
    embed.addField("`i.premium`", "Look at the features that the premium subscription has to offer");
    embed.addField('\n⠀', '[Add Imgscrpr to your Discord server!](https://discord.com/api/oauth2/authorize?client_id=904018497657532447&permissions=532576463936&scope=bot)');
    await msg.reply({ embeds: [embed] });
}


export async function SendPremiumMessage(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);
    if(Channel.channel.premium) {
        return await msg.reply("Thanks for buying it!");
    }
    
    const embed = new Discord.MessageEmbed();
    embed.setTitle("Imgscrpr Premium");
    embed.setColor("#d62e00");
    embed.setURL("https://www.patreon.com/imgscrpr");
    embed.setThumbnail("https://i.imgur.com/BdjBe41.png");
    embed.setDescription("Premium removes long rate limits and adds many perks. It amplifies your experience greatly, and also supports us in hosting Imgscrpr and creating a better experience for everyone.");
    embed.addField("Minimal Rate Limit", "Changes the waiting time between posts from 60 seconds to 5 seconds");
    embed.addField("Customizable Votes", "Gives the ability to edit the upvote/downvote reactions, as well as adding new ones");
    embed.addField("Change Commands", "Allows you to not only rename commands, but also to make new ones");
    embed.setFooter("Although buying premium enhances your channel's experience as well as supporting us, it isn't necessary, and we will still appreciate you regardless");

    return await msg.reply({ embeds: [embed] });
}