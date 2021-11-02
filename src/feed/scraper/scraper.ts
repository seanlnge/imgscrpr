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
        Object.keys(sr_connections(sub.subreddit)).forEach(a => subreddits.add(a));
    }

    // Rank subreddits from highest score to lowest score
    let ranked_subs = Array.from(subreddits).map((sub: string) =>({
        subreddit: sub,
        score: Math.cbrt(sr_score(sub, preference)) + Math.random() / 10,
        last: (get_subreddit(sub, preference) || { previous_post: undefined }).previous_post
    })).sort((a, b) => b.score - a.score);

    // Gives a 1:3:5:7:9 ratio
    let amount = 5;
    let random = Math.floor(Math.random()**2 * amount);

    console.log(ranked_subs.slice(0, amount));

    let sub = ranked_subs[random];
    let post = await get_post(sub.subreddit, { after: sub.last });
    while(!post) {
        let sub = ranked_subs[random];
        random = (random + 1) % amount;
        post = await get_post(sub.subreddit, { after: sub.last });
    }
    return { post, score: ranked_subs[random].score };

    /*// Get top post on hot from each subreddit
    let post_list: Post[] = [];
    for(let sub of top_subs) {
        post_list.push(...await get_post(sub));
    }

    // Process posts and return
    //return await process(preference, post_list);*/
}