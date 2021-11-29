import { readFileSync, writeFileSync } from 'fs';
import { GetChannel } from '../database/preference';

const subreddits = JSON.parse(readFileSync(__dirname + '/../../../public/subreddits.json', 'utf-8'));

export function SubredditConnections(subreddit: string) {
    return subreddits[subreddit] || { score: 0, total: 0, connections: [] };
}

export async function UpdateConnections(id: string, subreddit: string, score: number, total: number) {
    let weight = await SubredditScore(id, subreddit)/4 + 0.5;
    subreddits[subreddit].score += score * weight;
    subreddits[subreddit].total += total * weight;
    writeFileSync(__dirname + '/../../../public/subreddits.json', JSON.stringify(subreddits, null));
}

export async function SubredditScore(id: string, subreddit: string): Promise<number> {
    const Channel = await GetChannel(id);

    // Find weighted upvote/downvote ratio
    const sub = Channel.subreddits[subreddit];
    const base_score = sub ? sub.score / (sub.total + 4) : 0;

    // Add to score based on upvoted connections
    const sub_data = SubredditConnections(subreddit);
    let ratio = sub_data.score / (sub_data.total + 4);
    let connection_score = sub_data.connections.reduce((acc: number, cur: string) => {
        // Verify subreddit in preference
        let sub = Channel.subreddits[cur];
        if(!sub) return acc;

        //const connection = SubredditConnections(cur);
        //let connection_ratio = connection.score / (connection.total || 1);
        //let weight = 1 - Math.abs(ratio - connection_ratio);

        // Disallow for 0/0
        return acc + sub.score / (sub.total + 4);
    }, 0);
    
    return base_score + connection_score;
}