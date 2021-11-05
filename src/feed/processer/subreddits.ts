import { readFileSync } from 'fs';
import { Preference, get_subreddit } from '../../preference/preference';

const subreddits = JSON.parse(readFileSync(__dirname + '/../../../../public/subreddits.json', 'utf-8'));

export function sr_connections(subreddit: string) {
    return subreddits[subreddit] || [];
}

export function sr_score(subreddit: string, preference: Preference): number {
    function ud_ratio(subreddit: string) {
        let sub_data = get_subreddit(subreddit, preference);
        if(!sub_data) return 0;
        
        return sub_data.score / (sub_data.total + 8);
    }

    // Add to score based on upvoted connections
    let connection_score = sr_connections(subreddit).reduce((acc, cur) => acc + ud_ratio(cur) * 0.5, 0);
    return ud_ratio(subreddit) + connection_score;
}