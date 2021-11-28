import * as Discord from 'discord.js';
import { scrape } from '../scraper/scraper';
import { GetChannel, UpdateSubredditData, ResetChannel } from '../database/preference';
import { UpdateConnections } from '../scraper/subreddits';
import Post from '../post'

require('dotenv').config();

const Client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

Client.on("ready", () => {
    console.log(`Logged in as ${Client.user.tag}!`)
});


const HelpMessage = {
    "send": ["!~", "Send an image/video"],
    "reset": ["!~", "Reset channel preferences"],
    "add": ["!~ subreddit", "Add a subreddit to top of feed"],
    "remove": ["!~ subreddit", "Remove a subreddit from top of feed"]
};

async function SendHelpMessage(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);
    const embed = new Discord.MessageEmbed();
    embed.setTitle("Imgscrpr Commands");
    for(let command in HelpMessage) {
        let data = HelpMessage[command];
        embed.addField(
            data[0].replace("~", Channel.channel.commands[command]),
            data[1]
        );
    }
    msg.reply({ embeds: [embed] });
}

/**
 * Add subreddit to top of channel preference
 * @param msg Discord message object
 * @param subreddit Subreddit name
 */
async function AddSubreddit(msg: Discord.Message, subreddit: string) {
    const Channel = await GetChannel(msg.channelId);

    // Get top subreddit in preference
    let top = Object.keys(Channel.subreddits).reduce((previous: any, sname) => {
        let subreddit = Channel.subreddits[sname];
        if(!previous) return subreddit;
        return [previous, subreddit].sort((a, b) => b.score - a.score)[0];
    }, undefined);
    Channel.AddSubreddit(subreddit, top.score + 1, top.total);

    // Update in database and finalize
    await UpdateSubredditData(msg.channelId, subreddit);
    await msg.channel.send(`**r/${subreddit}** has been added to your personalized feed`);
}

/**
 * Remove subreddit from channel preferences
 * @param msg Discord message object
 * @param subreddit Subreddit name
 */
async function RemoveSubreddit(msg: Discord.Message, subreddit: string) {
    const Channel = await GetChannel(msg.channelId);
    delete Channel.subreddits[subreddit];

    // Update in database and finalize
    await UpdateSubredditData(msg.channelId, subreddit);
    await msg.channel.send(`__r/${subreddit}__ will no longer show up in your feed`);
}

async function SendPost(msg: Discord.Message) {
    const Channel = await GetChannel(msg.channelId);
    if(
        Date.now() - Channel.channel.last_accessed < 300000
        && !Channel.channel.premium
    ) {
        let time_left = 300000 - (Date.now() - Channel.channel.last_accessed);
        const embed = new Discord.MessageEmbed();
        embed.description = `Thanks for recognition, but API calls are expensive\n\n`
                          + `Please wait **${Math.ceil(time_left/1000)} seconds** or upgrade to our premium version`;
        await msg.channel.send({ embeds: [embed] });
        return;
    }
    console.log(Date.now() - Channel.channel.last_accessed);

    const Post: Post = await scrape(msg.channelId);

    if(!Post) {
        await msg.channel.send("We had some issues, please try again");
        return;
    }

    // Create embeded message
    let format_sub = '/r/' + Post.subreddit;
    const embed = new Discord.MessageEmbed();
    embed.setTitle(format_sub).setURL('https://reddit.com' + format_sub);
    embed.setDescription(Post.title);

    // Discord doesn't allow for embed videos
    if(!Post.video) embed.setImage(Post.url);
    const Message = await msg.channel.send({
        embeds: [embed],
        files: Post.video ? [Post.url] : []
    });
    
    // Send all reactions
    for(const reaction in Channel.channel.reactions) {
        await Message.react(reaction);
    }

    // Save previous subreddit data
    let last_subreddit = Channel.LastAccessed();
    if(last_subreddit) await UpdateSubredditData(msg.channelId, last_subreddit);

    // Get/create subreddit data in channel preference
    if(!(Post.subreddit in Channel.subreddits)) {
        Channel.AddSubreddit(Post.subreddit, 0, 0, Post.time);
    }
    const Subreddit = Channel.subreddits[Post.subreddit];
    Subreddit.previous_post_utc = Post.time;
    Subreddit.last_accessed = Date.now();
    Channel.channel.last_accessed = Date.now();
    
    // Collect reactions
    const Collector = Message.createReactionCollector({
        filter: (reaction, user) => !user.bot && reaction.emoji.name in Channel.channel.reactions,
        time: 1200000,
        dispose: true,
    });

    // Store for ending
    let initial_score = Subreddit.score;
    let initial_total = Subreddit.total;

    // On reaction add
    Collector.on('collect', async reaction => {
        let score = Channel.channel.reactions[reaction.emoji.name];
        if(!score) return;

        Subreddit.score += score;
        Subreddit.total++;
    });

    // On reaction remove
    Collector.on('remove', async reaction => {
        let score = Channel.channel.reactions[reaction.emoji.name];
        if(!score) return;

        Subreddit.score -= score;
        Subreddit.total--;
    });

    // At end of 20 minutes update database
    Collector.on("end", async () => {
        await UpdateSubredditData(msg.channelId, Post.subreddit);
        await UpdateConnections(msg.channelId, Post.subreddit, Subreddit.score - initial_score, Subreddit.total - initial_total);
    });
}

/**
 * Reset channel and channel preferences
 * @param msg Discord message object
 */
async function Reset(msg: Discord.Message) {
    await ResetChannel(msg.channelId);
    await msg.channel.send("Channel reset");
}

Client.on("messageCreate", async msg => {
    if(msg.author.bot) return;
    if(msg.content.trim()[0] != '!') return;

    const message = msg.content.slice(1).split(/\s/g);
    message.filter(a => a.length != 0);
    if(message[0] == "help") await SendHelpMessage(msg);

    if(message[0] == "add") await AddSubreddit(msg, message[1].replace(/(r\/|\/)/g, ""));
    if(message[0] == 'remove') await RemoveSubreddit(msg, message[1].replace(/(r\/|\/)/g, ""));
    if(message[0] == "send") await SendPost(msg);
    if(message[0] == "reset") await Reset(msg);
});

export function login() {
    Client.login(process.env.TOKEN);
}