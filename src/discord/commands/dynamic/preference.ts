import * as Discord from 'discord.js'
import { GetChannel, UpdateChannel, ResetChannel } from '../../../database/preference';

/**
 * Add subreddit to top of channel preference
 * @param msg Discord message object
 * @param subreddit Subreddit name
 */
export async function AddSubreddit(msg: Discord.Message, options: string[]) {
    if(options.length == 0) {
        await msg.reply("Subreddit name needs to be included: `i.add subreddit`").catch(() => undefined);;
        return;
    }
    
    if(!/^[a-z0-9]+$/i.test(options[0])) return await msg.reply(`Subreddit names need to be alphanumeric!`);

    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const subreddit = options[0].replace(/(r\/|\/)/g, "");

    // Get top subreddit in preference
    let top = Object.keys(Channel.subreddits).reduce((previous: any, sname) => {
        let subreddit = Channel.subreddits[sname];
        if(!previous) return subreddit;
        return [previous, subreddit].sort((a, b) => b.score - a.score)[0];
    }, undefined);
    Channel.AddSubreddit(subreddit, top.score + 3, top.total + 3);

    // Update in database and finalize
    await UpdateChannel(msg.guildId, msg.channelId);
    await msg.channel.send(`**r/${subreddit}** has been added to the personalized feed`).catch(() => undefined);;
}

/**
 * Remove subreddit from channel preferences
 * @param msg Discord message object
 * @param subreddit Subreddit name
 */
export async function RemoveSubreddit(msg: Discord.Message, options: string[]) {
    if(options.length == 0) {
        msg.reply("Subreddit name needs to be included: `i.remove subreddit`").catch(() => undefined);;
        return;
    }

    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const subreddit = options[0].replace(/(r\/|\/)/g, "");

    Channel.channel.removed.push(subreddit);
    delete Channel.subreddits[subreddit];

    // Update in database and finalize
    await UpdateChannel(msg.guildId, msg.channelId);
    await msg.channel.send(`**r/${subreddit}** will no longer show up in the feed`).catch(() => undefined);;
}

/**
 * Reset channel and channel preferences
 * @param msg Discord message object
 */
export async function Reset(msg: Discord.Message) {
    await ResetChannel(msg.guildId, msg.channelId);
    await msg.channel.send("Channel reset").catch(() => undefined);;
}