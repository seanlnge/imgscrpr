import * as Discord from 'discord.js'
import { GetChannel, UpdateSubredditData, ResetChannel } from '../../../database/preference';

/**
 * Add subreddit to top of channel preference
 * @param msg Discord message object
 * @param subreddit Subreddit name
 */
export async function AddSubreddit(msg: Discord.Message, options: string[]) {
    if(options.length == 0) {
        msg.reply("Subreddit name needs to be included: `i.add subreddit`");
        return;
    }

    const Channel = await GetChannel(msg.channelId);
    const subreddit = options[0].replace(/(r\/|\/)/g, "");

    // Get top subreddit in preference
    let top = Object.keys(Channel.subreddits).reduce((previous: any, sname) => {
        let subreddit = Channel.subreddits[sname];
        if(!previous) return subreddit;
        return [previous, subreddit].sort((a, b) => b.score - a.score)[0];
    }, undefined);
    Channel.AddSubreddit(subreddit, top.score + 3, top.total);

    // Update in database and finalize
    await UpdateSubredditData(msg.channelId, subreddit);
    await msg.channel.send(`**r/${subreddit}** has been added to the personalized feed`);
}

/**
 * Remove subreddit from channel preferences
 * @param msg Discord message object
 * @param subreddit Subreddit name
 */
export async function RemoveSubreddit(msg: Discord.Message, options: string[]) {
    if(options.length == 0) {
        msg.reply("Subreddit name needs to be included: `i.remove subreddit`");
        return;
    }

    const Channel = await GetChannel(msg.channelId);
    const subreddit = options[0].replace(/(r\/|\/)/g, "");

    delete Channel.subreddits[subreddit];

    // Update in database and finalize
    await UpdateSubredditData(msg.channelId, subreddit);
    await msg.channel.send(`__r/${subreddit}__ will no longer show up in the feed`);
}

/**
 * Reset channel and channel preferences
 * @param msg Discord message object
 */
export async function Reset(msg: Discord.Message) {
    await ResetChannel(msg.channelId);
    await msg.channel.send("Channel reset");
}