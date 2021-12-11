import * as Discord from 'discord.js';
import * as Premium from './dynamic/premium';
import { GetChannel } from '../../database/preference';

const HelpMessage = [
    { command: "`i.send {subreddit?}`", description: "Send an image/video" },
    { command: "`i.reset`", description: "Reset subreddit statistics and preferences" },
    { command: "`i.add {subreddit}`", description: "Add a subreddit to top of feed" },
    { command: "`i.remove {subredddit}`", description: "Remove a subreddit from top of feed"},
    { command: "`i.settings`", description: "Open up the settings panel" },
    { command: "`i.admin`", description: "Give/revoke administrator access to user/role" },
    { premium: true, command: "`i.premium stats`", description: "Show statistics on the current channel" },
];


export async function SendHelpMessage(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    embed.setTitle("Imgscrpr Help");
    embed.setDescription("Mobile typing is weird, so Imgscrpr responds to any casing, as well as extra spaces. Curly brackets contain command parameters, question marks mean the argument is optional, and the straight line symbol means either/or.\n")
    
    embed.addField("\n⠀", "**--- Imgscrpr Commands ---**");
    for(let { command, description, premium } of HelpMessage) {
        if(!Channel.channel.premium && premium) continue;
        embed.addField(command, description, true);
    }
    // Add premium commands
    if(!Channel.channel.premium) embed.addField("`i.premium`", "Look at the features that the premium subscription has to offer");

    // Premium dashboard for premium users
    if(await Premium.IsPremium(msg.author.id)) {
        embed.addField("\n⠀", "**--- Premium Commands ---**");
        embed.addField("`i.premium display`", "Display information about your premium subscription");
        embed.addField("`i.premium add`", "Add Imgscrpr premium to a Discord channel");
        embed.addField("`i.premium remove`", "Remove Imgscrpr premium from a Discord channel");
    }

    embed.addField('\n⠀', '[Add Imgscrpr to your Discord server!](https://discord.com/api/oauth2/authorize?client_id=904018497657532447&permissions=532576463936&scope=bot)');
    await msg.reply({ embeds: [embed] });
}


export async function SendPremiumMessage(msg: Discord.Message, options: string[]) {
    const Channel = await GetChannel(msg.channelId);
    if(Channel.channel.premium) {
        if(options.length) {
            switch(options[0].toLowerCase()) {
                case 'help': return Premium.Help(msg);
                case 'display': case 'info': return Premium.Display(msg);
                case 'add': return Premium.Add(msg, options[0]);
                case 'remove': return Premium.Remove(msg, options[0]);
            }
        }

        return await msg.reply("Thanks for buying it!");
    }
    
    
    
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    embed.setTitle("Imgscrpr Premium");
    embed.setURL("https://www.patreon.com/imgscrpr");
    embed.setThumbnail("https://i.imgur.com/BdjBe41.png");
    embed.setDescription("Premium removes long rate limits and adds many perks. It amplifies your experience greatly, and also supports us in hosting Imgscrpr and creating a better experience for everyone.");
    embed.addField("Minimal Rate Limit", "Changes the waiting time between posts from 60 seconds to 5 seconds");
    embed.addField("Customizable Votes", "Gives the ability to edit the upvote/downvote reactions, as well as adding new ones");
    embed.addField("Change Commands", "Allows you to not only rename commands, but also to make new ones");
    embed.setFooter("Although buying premium enhances your channel's experience as well as supporting us, it isn't necessary, and we will still appreciate you regardless");

    return await msg.reply({ embeds: [embed] });
}