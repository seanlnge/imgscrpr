import { readFileSync } from 'fs';
import { GetChannel } from '../database/preference';

const subreddits = JSON.parse(readFileSync(__dirname + '/../../../public/subreddits.json', 'utf-8'));

export function SubredditConnections(subreddit: string) {
    return subreddits[subreddit] || [];
}

export async function SubredditScore(id: string, subreddit: string): Promise<number> {
    const Channel = await GetChannel(id);

    // Find weighted upvote/downvote ratio
    const weighted_ratio = (sname: string) => {
        const sub = Channel.subreddits[sname];

        const initial = -0.2; // Default rating
        const weight = 2; // Amount of user ratings initial should be equal to

        return sub ? (initial * weight + sub.score) / (sub.total + weight) : 0;
    }
    const base_score = weighted_ratio(subreddit);

    // Add to score based on upvoted connections
    const connections = SubredditConnections(subreddit);
    let connection_score = connections.reduce((acc: number, cur: string) => {
        // Find distance between subreddit score and connection score
        let ratio = weighted_ratio(cur);
        let dist = Math.abs(base_score - ratio);

        // Gaussian distribution to weight score
        let weight = 0.8/Math.exp(-(dist ** 2));
        let sub = Channel.subreddits[cur];
        return acc + weight * ratio * (sub ? sub.total : 0);
    }, 0);
    let connection_total = connections.reduce((acc: number, cur: string) => {
        let sub = Channel.subreddits[cur];
        return acc + (sub ? sub.total : 0);
    }, 0);

    connection_score /= (connection_total || 1);
    return base_score + connection_score;
}