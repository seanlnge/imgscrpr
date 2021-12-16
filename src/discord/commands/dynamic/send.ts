import * as Discord from 'discord.js'
import { GetChannel, UpdateChannel } from '../../../database/preference';
import { ScrapeFromFeed, ScrapeFromSubreddit } from '../../../scraper/scraper';
import Post from '../../../post';
import { UpdateConnections } from '../../../scraper/subreddits';
import { ChannelIsPremium } from './premium';

/**
 * Send personalized post with option for specific subreddit
 * @param msg Discord message object
 * @param options Array containing optional subreddit
 * @returns 
 */
export async function SendPost(msg: Discord.Message, options: string[]) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const Premium = await ChannelIsPremium(msg.guildId, msg.channelId);

    if(!Premium && Date.now() - Channel.channel.last_accessed < 60000) {
        let time_left = 60000 - (Date.now() - Channel.channel.last_accessed);
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        embed.description = `Thanks for recognition, but API calls are expensive\n\n`
                          + `Please wait **${Math.ceil(time_left/1000)} seconds** or upgrade to our premium version`;
        await msg.channel.send({ embeds: [embed] });
        return;
    }
    
    if(Premium && Date.now() - Channel.channel.last_accessed < 3000) {
        let time_left = 3000 - (Date.now() - Channel.channel.last_accessed);
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        embed.description =`Please wait **${Math.ceil(time_left/1000)} seconds**`;
        await msg.channel.send({ embeds: [embed] });
        return;
    }

    const Post: (Post | string) = await (async () => {
        if(options[0]) return await ScrapeFromSubreddit(msg.guildId, msg.channelId, options[0].replace(/(r\/|\/)/g, ""));
        return await ScrapeFromFeed(msg.guildId, msg.channelId);
    })();

    if(typeof Post == "string") {
        await msg.reply(Post);
        return;
    }

    if(!Post) {
        await msg.reply("We had some issues, please try again");
        return;
    }

    // Create embeded message
    let format_sub = '/r/' + Post.subreddit;
    const embed = new Discord.MessageEmbed();
    embed.setTitle(format_sub).setURL('https://reddit.com' + format_sub);
    embed.setColor("#d62e00");
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
    if(last_subreddit) await UpdateChannel(msg.guildId, msg.channelId);

    // Get/create subreddit data in channel preference
    if(!(Post.subreddit in Channel.subreddits)) {
        Channel.AddSubreddit(Post.subreddit, 0, 0, Post.time);
    }
    const Subreddit = Channel.subreddits[Post.subreddit];
    Subreddit.previous_post_utc = Post.time;
    Subreddit.last_accessed = Date.now();
    Channel.channel.last_accessed = Date.now();
    Channel.statistics.posts++;
    
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

        Channel.statistics.votes++;
        Channel.statistics.score += score;
        Subreddit.score += score;
        Subreddit.total++;
    });

    // On reaction remove
    Collector.on('remove', async reaction => {
        let score = Channel.channel.reactions[reaction.emoji.name];
        if(!score) return;

        Channel.statistics.votes--;
        Channel.statistics.score -= score;
        Subreddit.score -= score;
        Subreddit.total--;
    });

    // At end of 20 minutes update database
    Collector.on("end", async () => {
        await UpdateChannel(msg.guildId, msg.channelId);
        await UpdateConnections(msg.guildId, msg.channelId, Post.subreddit, Subreddit.score - initial_score, Subreddit.total - initial_total);
    });
}