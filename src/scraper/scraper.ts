import * as Reddit from './reddit';
import Post from '../post';
import * as Cache from '../store/cache';
import { Preference, get_subreddit } from '../store/preference';
import { sr_score, sr_connections } from './subreddits';

export async function scrape(preference: Preference) {
    // Sort all subreddits in preference database
    let subreddits: Set<string> = new Set();
    for(let sub of preference) {
        subreddits.add(sub.subreddit);
        sr_connections(sub.subreddit).forEach(a => subreddits.add(a));
    }

    // Rank subreddits from highest score to lowest score
    let ranked_subs = Array.from(subreddits).map((sub: string) =>({
        subreddit: sub,
        score: Math.cbrt(sr_score(sub, preference)) + Math.random() / 10,
        last: (get_subreddit(sub, preference) || { previous_post: undefined }).previous_post
    })).sort((a, b) => b.score - a.score);

    // Gives a even ratio for picking top subs
    let amount = 5;
    let total = ranked_subs.slice(0, amount).reduce((a, c) => a + c.score ** 3, 0);
    let random_float = Math.random() * total;
    let random = ranked_subs.findIndex(a => 0 > (random_float -= a.score**3));

    let post: Post = undefined;
    while(!post) {
        // Obtain post
        let sub = ranked_subs[random];
        random = (random + 1) % amount;

        // Check for post in cache
        let cached_post = Cache.get_post(sub.subreddit, sub.last);
        if(cached_post) {
            post = cached_post; 
            break;  
        }

        // Fallback to reddit post
        let post_type = await Reddit.get_post(sub.subreddit, { after: sub.last });

        // Make sure post is valid
        if(!post_type) continue;
        if(typeof post_type == "string") {
            sub.last = post_type as string;
        } else {
            post = post_type as Post;
            Cache.add_post(sub.subreddit, post);
        }
    }
    return { post, score: ranked_subs[random].score };
}