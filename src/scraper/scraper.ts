import * as Reddit from './reddit';
import Post from '../post';
import * as Cache from '../database/cache';
import { GetChannel } from '../database/preference';
import { SubredditScore, SubredditConnections } from './subreddits';

async function ranked_subreddits(id: string): Promise<{ subreddit: string, score: number, last: number }[]> {
    const Channel = await GetChannel(id);

    // Sort all subreddits in preference database
    let subreddit_set: Set<string> = new Set();
    for(let sub in Channel.subreddits) {
        subreddit_set.add(sub);
        SubredditConnections(sub).connections.forEach((a: string) => subreddit_set.add(a));
    }
    let subreddits = Array.from(subreddit_set);

    // Rank subreddits from highest score to lowest score
    let parsed_subs = subreddits.map(async (sub: string) => {
        return {
            subreddit: sub,
            score: await SubredditScore(id, sub) + Math.random() / 20,
            last: Channel.subreddits[sub] ? Channel.subreddits[sub].previous_post_utc : 0
        }
    });
    return (await Promise.all(parsed_subs)).sort((a, b) => b.score - a.score);
}

export async function ScrapeFromSubreddit(id: string, subreddit: string): Promise<Post> {
    const Channel = await GetChannel(id);
    const sub = Channel.subreddits[subreddit];

    // Check for cached posts
    let cached_post = Cache.get_post(subreddit, sub ? sub.previous_post_utc : 0);
    if(cached_post) return cached_post;

    // Look through reddit
    let posts = await Reddit.get_posts(subreddit, sub ? sub.previous_post_utc : 0);
    posts = posts.filter(a => !a.nsfw || Channel.channel.allow_nsfw);
    if(!posts.length) return undefined;

    // Cache and finalize
    let post = posts.reduce((a, c) => a.time < c.time ? a : c, posts[0]) as Post;
    Cache.add_posts(subreddit, posts);
    return post;
}

export async function ScrapeFromFeed(id: string): Promise<Post> {
    const Channel = await GetChannel(id);
    const ranked_subs = await ranked_subreddits(id);

    // Gives a weighted ratio for picking top subs
    let amount = 5;
    let total = ranked_subs.slice(0, amount).reduce((a, c) => a + c.score, 0);
    let random_float = Math.random() * total;

    let random = ranked_subs.findIndex(a => 0 >= (random_float -= a.score));
    let end = random + amount;

    while(end != random) {
        // Obtain post
        let sub = ranked_subs[random];
        random++;
        if(!sub) continue;

        // Check for post in cache
        let cached_post = Cache.get_post(sub.subreddit, sub.last);
        if(cached_post) return cached_post;

        // Fallback to reddit post
        let posts = await Reddit.get_posts(sub.subreddit, sub.last);
        posts = posts.filter(a => !a.nsfw || Channel.channel.allow_nsfw);
        if(!posts.length) continue;

        // Cache and finalize
        let post = posts.reduce((a, c) => a.time < c.time ? a : c, posts[0]) as Post;
        Cache.add_posts(sub.subreddit, posts);
        return post;
    }

    return undefined;
}