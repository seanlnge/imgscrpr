import * as Discord from 'discord.js'
import { GetChannel, UpdateChannel } from '../../../database/preference';
import { ScrapeFromFeed, ScrapeFromSubreddit } from '../../../scraper/scraper';
import Post from '../../../post';
import { ChannelIsPremium } from '../premium/static';
import { UserIsAdmin } from './permissions';

require('dotenv').config();

/**
 * Send personalized post with option for specific subreddit
 * @param msg Discord message object
 * @param options Array containing optional subreddit
 * @returns 
 */
export async function SendPost(msg: Discord.Message, options: string[]) {
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const Premium = await ChannelIsPremium(msg.guildId, msg.channelId);

    if(!Premium && Date.now() - Channel.channel.last_accessed < parseFloat(process.env.WAIT_TIME_MS)) {
        let time_left = parseFloat(process.env.WAIT_TIME_MS) - (Date.now() - Channel.channel.last_accessed);
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        embed.description = `Thanks for recognition, but sending API calls is expensive\n\n`
                          + `Please wait **${Math.ceil(time_left/1000)} seconds** or upgrade to our premium version`;
        return await msg.channel.send({ embeds: [embed] }).catch(err => undefined);
    }
    
    if(Premium && Date.now() - Channel.channel.last_accessed < parseFloat(process.env.PREMIUM_WAIT_TIME_MS)) {
        let time_left = parseFloat(process.env.PREMIUM_WAIT_TIME_MS) - (Date.now() - Channel.channel.last_accessed);
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        embed.description =`Please wait **${time_left} milliseconds**`;
        return await msg.channel.send({ embeds: [embed] }).catch(err => undefined);
    }
    
    const Post: (Post | string) = await (async () => {
        if(options[0]) return await ScrapeFromSubreddit(msg.guildId, msg.channelId, options[0].replace(/(r\/|\/)/g, ""));
        return await ScrapeFromFeed(msg.guildId, msg.channelId);
    })();

    if(typeof Post == "string") return await msg.reply(Post).catch(err => err);
    if(!Post) return await msg.reply("We had some issues, please try again").catch(err => err);

    // Create embeded message
    const embed = new Discord.MessageEmbed();
    embed.setTitle('/r/' + Post.subreddit).setURL(Post.url);
    embed.setColor("#d62e00");

    let data: { [key: string]: any } = { embeds: [embed] };

    // Max title size 256 chars
    if(Post.title.length > 256) {
        Post.title = Post.title.slice(0, 252) + ' ...';
    }

    // Discord doesn't allow for embed videos
    if(Post.type == "video") {
        embed.setDescription(Post.title);
        data.files = [Post.data]   
    }

    else if(Post.type == "image") {
        embed.setDescription(Post.title);
        embed.setImage(Post.data);
    }

    // Make sure less than 1000 chars
    else if(Post.type == "text") {
        if(Post.data.length > 1000) {
            const end_length = 17 + Post.url.length;
            Post.data = `${Post.data.slice(0, 1000 - end_length)} ...\n\n[Full Post](${Post.url})`;
        }
        embed.addField(Post.title, Post.data || '\u2800');
    }

    if(!msg.channel) return;
    const Message = await msg.channel.send(data).catch(err => undefined);
    if(!Message) return;
    
    // Send all reactions
    for(const reaction in Channel.channel.reactions) {
        await Message.react(reaction).catch(err => undefined);
    }
    await Message.react('❌').catch(err => undefined);

    // Get/create subreddit data in channel preference
    if(!(Post.subreddit in Channel.subreddits)) {
        Channel.AddSubreddit(Post.subreddit, 0, 0);
    }

    // Needs to be lowercase; objects are case-sensitive, so are subreddits
    const Subreddit = Channel.subreddits[Post.subreddit];
    Subreddit.posts[Post.id] = Post.time;
    Channel.channel.last_accessed = Date.now();
    Channel.statistics.posts++;
    
    // Collect reactions
    const Collector = Message.createReactionCollector({
        filter: reaction => reaction.emoji.name in Channel.channel.reactions || reaction.emoji.name == "❌",
        time: 1200000,
        dispose: true,
    });

    // On reaction add
    Collector.on('collect', async (reaction, user) => {
        if(user.bot) return;

        if(reaction.emoji.name == "❌" && await UserIsAdmin(msg, user.id)) {
            return await Message.delete().catch(err => undefined);
        }
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
        await Message.reactions.removeAll().catch(err => /* ok? */ {});
        await UpdateChannel(msg.guildId, msg.channelId);
    });
}