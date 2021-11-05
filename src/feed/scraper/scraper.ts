import { get_post } from './reddit';
import { process } from '../processer/processer';
import Post from '../../post';
import { Preference, get_subreddit } from '../../preference/preference';
import { sr_score, sr_connections } from '../processer/subreddits';

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

    // Gives a 9:7:5:3:1 ratio of picking top subs
    let amount = 5;
    let random = Math.floor(Math.random()**2 * amount);

    let post: Post = undefined;
    while(!post) {
        // Obtain post
        let sub = ranked_subs[random];
        random = (random + 1) % amount;

        let post_type = await get_post(sub.subreddit, { after: sub.last });

        // Make sure post is valid
        if(!post_type) continue;
        if(typeof post_type == "string") {
            sub.last = post_type as string;
            console.log(post_type);
        } else {
            post = post_type as Post;
            console.log(post.subreddit, post.url);
        }
    }
    return { post, score: ranked_subs[random].score };
}