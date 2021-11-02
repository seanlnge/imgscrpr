import { readFileSync } from 'fs';
import { Preference, get_subreddit } from '../../preference/preference';

const subreddits = JSON.parse(readFileSync(__dirname + '/subreddits.json', 'utf-8'));

export function sr_connections(subreddit: string) {
    let data = subreddits[subreddit] || {};
    delete data.count;
    return data;
}

export function sr_score(subreddit: string, preference: Preference): number {
    function ud_ratio(subreddit: string) {
        let sub_data = get_subreddit(subreddit, preference);
        if(!sub_data) return 0;

        let upvotes = sub_data.upvotes;
        let downvotes = sub_data.downvotes;

        return (upvotes - downvotes) / (upvotes + downvotes + 8);
    }

    let connections = sr_connections(subreddit);

    let connection_score = Object.keys(connections).reduce((acc, cur) => acc
        + connections[cur] / 100
        * ud_ratio(cur)
    , 0);

    return ud_ratio(subreddit) + connection_score;
}