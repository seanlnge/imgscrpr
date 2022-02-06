import * as Discord from 'discord.js';
import { UserIsPremium, Help, Display, ChannelIsPremium } from './premium/static';
import { Add, List, Remove } from './premium/subscription';

const HelpMessage = [
    { name: 'send', command: "i.send {subreddit}?", description: "Send a Reddit post", full: "Send an image, video, or text post from either the channel's preference by not adding an argument, or a particular subreddit by adding the subreddit as the only argument" },
    { name: 'reset', command: "i.reset", description: "Reset subreddit statistics and personalization", full: "Reset the entire channel excluding the channel settings. This means that the preferences of all subreddits and all of the statistics will be cleared" },
    { name: 'add', command: "i.add {subreddit}", description: "Add a subreddit to top of feed", full: "Take the given subreddit and prioritize it in the channel's subreddit preference" },
    { name: 'remove', command: "i.remove {subredddit}", description: "Remove a subreddit from top of feed", full: "Take the given subreddit and remove it from the channel's subreddit preference"},
    { name: 'settings', command: "i.settings", description: "Open up the settings panel", full: "Open up the panel that shows the channel's settings" },
    { name: 'admin', command: "i.admin add|remove {user|role}", description: "Change administrator access", full: "Either give administrator permissions to a user or a role, or remove them. Administrator permissions allow users to change channel settings, and edit preferences." },
    { name: 'presets', command: "i.preset", description: "Open up the help menu for adding presets", full: "Open up the help menu presets, which allows you to create, modify, edit, and send custom feeds" },
    { name: 'stats', premium: true, command: "i.stats", description: "Show statistics on the current channel", full: "Show statistics such as number of posts, votes, and ratios between them" },
    { name: 'subreddits', premium: true, command: "i.subreddits {amount}?", description: "List the top subreddits in your preferences", full: "List the top subreddits in the channel preference, as well as the post evaluation score for each. If the amount parameter is omitted, it defaults to 5." },
    { name: 'reactions', premium: true, command: "i.reactions [add {reaction} {score}]?", description: "List the post scoring reactions panel", full: "Open up the reaction panel that allows you to add and remove scoring reactions to posts" }
];


export async function SendHelpMessage(msg: Discord.Message, options: string[]) {
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    const prem = await ChannelIsPremium(msg.guildId, msg.channelId);

    // Detailed help message
    if(options.length) {
        let command = HelpMessage.find(a => a.name == options[0]);
        if(!command) return await msg.reply(`"${options[0]}" is not a command`);
        if(command.premium && !prem) return await msg.reply(`"${options[0]}" is a premium command! Get premium through \`i.premium\``);
        if(options.length != 1) return await msg.reply(`These arguments do not do anything: ${options.slice(1).join(', ')}`);

        embed.setTitle(command.command);
        embed.setDescription(command.full);
    }
    
    // Default help message
    else {
        embed.setTitle("Imgscrpr Help");
        embed.setDescription("Mobile typing is weird, so Imgscrpr responds to any casing, as well as extra spaces. Curly brackets contain command parameters, question marks mean optional, straight brackets are groups, and the straight line symbol means either/or.\n")
        
        for(let { command, description, premium } of HelpMessage) {
            if(premium && !prem) continue;
            embed.addField('⠀', `**\`${command}\`** - ${description}`);
        }

        // Add premium commands
        if(!await UserIsPremium(msg.author.id)) {
            embed.addField("\n`i.premium`", "Look at the features that the premium subscription has to offer");
        } else {
            embed.addField("\n`i.premium`", "View the help menu for premium commands");
        }
    }
    embed.addField('\n⠀', 'Type `i.help {command}` for a detailed explanation\n[Add Imgscrpr to your Discord server!](https://discord.com/api/oauth2/authorize?client_id=904018497657532447&permissions=27712&scope=bot)\n[Join our support server!](https://discord.gg/wx8UfHQr48)');
    await msg.reply({ embeds: [embed] }).catch(() => undefined);
}


export async function SendPremiumMessage(msg: Discord.Message, options: string[]) {
    const premium = await UserIsPremium(msg.author.id);
    if(premium) {
        if(options.length) {
            switch(options[0]) {
                case 'help': return Help(msg, options);
                case 'display': case 'info': return Display(msg);
                case 'list': return List(msg);
                case 'add': return Add(msg, options.slice(1));
                case 'remove': return Remove(msg, options.slice(1));
            }
        }

        return await Help(msg, options);
    }
    
    const embed = new Discord.MessageEmbed({ color: "#d62e00" });
    embed.setTitle("Imgscrpr Premium");
    embed.setURL("https://www.patreon.com/imgscrpr");
    embed.setThumbnail("https://i.imgur.com/BdjBe41.png");
    embed.setDescription("Premium removes long rate limits and adds many perks. It amplifies your experience greatly, and also supports us in hosting Imgscrpr and creating a better experience for everyone.");
    embed.addField("Tiny Rate Limit", "Changes the waiting time between posts from 10 seconds to 0.1 seconds");
    embed.addField("Customizable Votes", "Gives the ability to edit the upvote/downvote reactions, as well as adding new ones");
    embed.addField("New Commands", "From statistics to meticulous customizations, premium adds many new commands to improve community experience");
    embed.setFooter("Although buying premium enhances your community's experience as well as supporting us, it isn't necessary, and we will still appreciate you for using Imgscrpr regardless");

    return await msg.reply({ embeds: [embed] }).catch(() => undefined);
}