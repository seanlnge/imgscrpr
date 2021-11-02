import Post from '../../post';
import { Preference } from '../../preference/preference';

import { sr_score } from './subreddits';

export async function process(preference: Preference, post_list: Post[]): Promise<{ post: Post, score: number }[]> {
    let possible = [];
    for(let post of post_list) {
        let score = sr_score(post.subreddit, preference);
        possible.push({ post, score });
    }

    possible.sort((a, b) => b.score - a.score);

    return possible;
}