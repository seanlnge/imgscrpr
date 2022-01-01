import * as Discord from 'discord.js'
import { GetChannel, UpdateChannel } from '../../../database/preference';
import { ScrapeFromFeed, ScrapeFromSubreddit } from '../../../scraper/scraper';
import Post from '../../../post';
import { ChannelIsPremium } from '../premium/static';

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
    const embed = new Discord.MessageEmbed();
    embed.setTitle('/r/' + Post.subreddit).setURL(Post.url);
    embed.setColor("#d62e00");

    let data: { [key: string]: any } = { embeds: [embed] };

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
            const end_length = 16 + Post.url.length;
            Post.data = `${Post.data.slice(0, 1000 - end_length)} ...\n[Full Post](${Post.url})`;
        }
        embed.addField(Post.title, Post.data || '\u2800');
    }

    const Message = await msg.channel.send(data);
    
    // Send all reactions
    for(const reaction in Channel.channel.reactions) {
        await Message.react(reaction);
    }
    await Message.react('❌')

    // Get/create subreddit data in channel preference
    if(!(Post.subreddit in Channel.subreddits)) {
        Channel.AddSubreddit(Post.subreddit, 0, 0);
    }
    const Subreddit = Channel.subreddits[Post.subreddit];
    Subreddit.posts[Post.id] = Post.time;
    Channel.channel.last_accessed = Date.now();
    Channel.statistics.posts++;
    
    // Collect reactions
    const Collector = Message.createReactionCollector({
        filter: (reaction, user) => reaction.emoji.name in Channel.channel.reactions || reaction.emoji.name == "❌",
        time: 1200000,
        dispose: true,
    });

    // On reaction add
    Collector.on('collect', async reaction => {
        if(reaction.emoji.name == "❌") {
            return await Message.delete();
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
        await Message.reactions.removeAll();
        await UpdateChannel(msg.guildId, msg.channelId);
    });
}