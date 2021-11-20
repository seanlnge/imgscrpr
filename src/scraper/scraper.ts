import * as Reddit from './reddit';
import Post from '../post';
import * as Cache from '../database/cache';
import { GetChannel } from '../database/preference';
import { SubredditScore, SubredditConnections } from './subreddits';

export async function scrape(id: string): Promise<Post> {
    const Channel = await GetChannel(id);

    // Sort all subreddits in preference database
    let subreddit_set: Set<string> = new Set();
    for(let sub in Channel.subreddits) {
        subreddit_set.add(sub);
        SubredditConnections(sub).forEach((a: string) => subreddit_set.add(a));
    }
    let subreddits = Array.from(subreddit_set);

    // Rank subreddits from highest score to lowest score
    let parsed_subs = subreddits.map(async (sub: string) => {
        return {
            subreddit: sub,
            score: await SubredditScore(id, sub),
            last: Channel.subreddits[sub] ? Channel.subreddits[sub].previous_post_utc : 0
        }
    });
    let ranked_subs = (await Promise.all(parsed_subs)).sort((a, b) => b.score - a.score);

    // Gives a weighted ratio for picking top subs
    let amount = 5;
    let total = ranked_subs.slice(0, amount).reduce((a, c) => a + c.score, 0);
    let random_float = Math.random() * total;

    let random = ranked_subs.findIndex(a => 0 > (random_float -= a.score));
    let end = random + amount;

    let post: Post = undefined;
    while(end != random) {
        // Obtain post
        let sub = ranked_subs[random];
        random++;
        if(!sub) continue;

        // Check for post in cache
        let cached_post = Cache.get_post(sub.subreddit, sub.last);
        if(cached_post) {
            post = cached_post; 
            break;
        }

        // Fallback to reddit post
        let posts = await Reddit.get_posts(sub.subreddit, sub.last);
        if(!posts.length) continue;

        // Cache and edit preference
        let oldest = posts.reduce((a, c) => a.time < c.time ? a : c, posts[0]) as Post;
        post = oldest;

        Cache.add_posts(sub.subreddit, posts);
        return post;
    }

    return post;
}