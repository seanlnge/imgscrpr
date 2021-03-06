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
    let cached_post = Cache.Get(subreddit, sub ? sub.posts : {});
    if(cached_post) return cached_post;

    // Look through reddit
    let posts = [];
    let after = undefined;
    
    // Find new posts given others are old
    for(let i=0; i<10 && !posts.length; i++) {
        let reddit_response = await Reddit.GetPosts(Channel.channel, subreddit, after);
        if(reddit_response.error) return reddit_response.error;
        if(!reddit_response.posts.length) return "No posts from this subreddit right now!";

        // Verify posts are timely
        posts = reddit_response.posts.filter(a => !(sub && (a.id in sub.posts)));
        after = reddit_response.after;
    }

    // Cache and finalize
    Cache.Add(subreddit, posts);
    return posts[0];
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
        if(Channel.channel.removed.includes(sub)) continue;
        subreddit_set.add(sub);
        SubredditConnections(sub).forEach((a: string) => subreddit_set.add(a));
    }
    let subreddits = Array.from(subreddit_set).filter(a => !Channel.channel.removed.includes(a));

    // Rank subreddits from highest score to lowest score
    let parsed_subs = await Promise.all(
        subreddits.map(async (sub: string) => {
            return {
                subreddit: sub,
                score: await SubredditScore(server_id, channel_id, sub) + Math.random() / 20
            }
        })
    );
    let ranked_subs = parsed_subs.sort((a, b) => b.score - a.score);

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