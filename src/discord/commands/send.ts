import * as Discord from 'discord.js';
import { GetChannel, UpdateSubredditData } from '../../database/preference';
import { ScrapeFromFeed, ScrapeFromSubreddit } from '../../scraper/scraper';
import Post from '../../post';
import { UpdateConnections } from '../../scraper/subreddits';

const WaitTimeMs = 60000;

export async function SendPost(msg: Discord.Message, options: string[]) {
    const Channel = await GetChannel(msg.channelId);
    if(
        Date.now() - Channel.channel.last_accessed < WaitTimeMs
        && !Channel.channel.premium
    ) {
        let time_left = WaitTimeMs - (Date.now() - Channel.channel.last_accessed);
        const embed = new Discord.MessageEmbed();
        embed.setColor("#d62e00");
        embed.description = `Thanks for recognition, but API calls are expensive\n\n`
                          + `Please wait **${Math.ceil(time_left/1000)} seconds** or upgrade to our premium version`;
        await msg.channel.send({ embeds: [embed] });
        return;
    }

    const Post: (Post | string) = await (async () => {
        // Acceptable sorting algorithms
        const sorts = ['hot', 'new', 'rising', 'top'];

        switch(options.length) {
            // Given only a sort
            case 1:
                if(!sorts.includes(options[0])) {
                    return `Sorry, ${options[0]} is not a valid sorting option. Please choose from: ${sorts.join(', ')}`;
                }
                return await ScrapeFromFeed(msg.channelId, options[0]);

            // Given a sort and a subreddit
            case 2:
                if(!sorts.includes(options[0])) {
                    return `Sorry, ${options[0]} is not a valid sorting option. Please choose from: ${sorts.join(', ')}`;
                }
                return await ScrapeFromSubreddit(msg.channelId, options[0], options[1]);

            // Default post sending is from feed on hot
            default:
                return await ScrapeFromFeed(msg.channelId, 'hot');
        }
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
        try {
            await Message.react(reaction);
        } catch {
            return;
        }
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