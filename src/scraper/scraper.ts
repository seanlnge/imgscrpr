import * as Reddit from './reddit';
import Post from '../post';
import * as Cache from '../database/cache';
import { GetChannel } from '../database/preference';
import { SubredditScore, SubredditConnections } from './subreddits';

/**
 * Find Reddit post given a subreddit
 * @param id Discord channel ID
 * @param subreddit Subreddit name
 * @returns Post or error message
 */
export async function ScrapeFromSubreddit(server_id: string, channel_id: string, subreddit: string): Promise<Post | string> {
    const Channel = await GetChannel(server_id, channel_id);
    const sub = Channel.subreddits[subreddit];

    // Check for cached posts
    let cached_post = Cache.get_post(subreddit, sub ? sub.previous_post_utc : 0);
    if(cached_post) return cached_post;

    // Look through reddit
    let reddit_response = await Reddit.GetPosts(Channel.channel, subreddit, undefined);
    if(reddit_response.error) return reddit_response.error;

    // Has to have been posted 2 hours - 24 hours ago to increase quality
    let posts = reddit_response.posts.filter(a => 
        a.time > (sub ? sub.previous_post_utc : 0)
        || Date.now()/1000-a.time < 7200
        || Date.now()/1000-a.time > 86400
    );
    let after = reddit_response.after;
    
    // Find new posts given others are old
    while(!posts.length) {
        let reddit_response = await Reddit.GetPosts(Channel.channel, subreddit, after);
        if(!reddit_response.posts.length) return "No posts from this subreddit right now!";
        if(reddit_response.error) return reddit_response.error;
        posts = reddit_response.posts.filter(a =>
            a.time > (sub ? sub.previous_post_utc : 0)
            || Date.now()/1000-a.time < 3600
            || Date.now()/1000-a.time > 86400
        );
        after = reddit_response.after;
    }

    // Cache and finalize
    let post = posts.reduce((a, c) => a.time < c.time ? a : c, posts[0]) as Post;
    Cache.add_posts(subreddit, posts);
    return post;
}

/**
 * Returns post from user preference
 * @param id Discord channel ID
 * @returns Post or error message
 */
export async function ScrapeFromFeed(server_id: string, channel_id: string): Promise<Post | string> {
    const Channel = await GetChannel(server_id, channel_id);

    // Sort all subreddits in preference database
    let subreddit_set: Set<string> = new Set();
    for(let sub in Channel.subreddits) {
        subreddit_set.add(sub);
        (await SubredditConnections(sub)).connections.forEach((a: string) => subreddit_set.add(a));
    }
    let subreddits = Array.from(subreddit_set);

    // Rank subreddits from highest score to lowest score
    let parsed_subs = (await Promise.all(subreddits.map(async (sub: string) => ({
        subreddit: sub,
        time: Channel.subreddits[sub] ? Channel.subreddits[sub].previous_post_utc : 0,
        score: await SubredditScore(server_id, channel_id, sub) + Math.random() / 20
    }))));
    let ranked_subs = parsed_subs.filter(a => Date.now()/1000-a.time > 3600).sort((a, b) => b.score - a.score);

    // Gives a weighted ratio for picking top subs
    let amount = Math.min(8, parsed_subs.length);
    let total = ranked_subs.slice(0, amount).reduce((a, c) => a + c.score, 0);

    for(let i=0; i<amount; i++) {
        // Calculate random subreddit index weighted towards sub scores
        let random_float = Math.random() * total;
        let random = ranked_subs.findIndex(a => 0 >= (random_float -= a.score));

        let post = await ScrapeFromSubreddit(server_id, channel_id, ranked_subs[random].subreddit);

        if(typeof post == "string") {
            // Removes duplicate scrapes
            total -= ranked_subs[random].score;
            ranked_subs.splice(random, 1);
            continue;
        };

        return post;
    }
    
    return "Unfortunately there was a problem";
}