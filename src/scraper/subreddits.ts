import { readFileSync, writeFileSync } from 'fs';
import { GetChannel } from '../database/preference';

const subreddits = JSON.parse(readFileSync(__dirname + '/../../../public/subreddits.json', 'utf-8'));

export function SubredditConnections(subreddit: string) {
    return subreddits[subreddit] || { score: 0, total: 0, connections: [] };
}

export async function UpdateConnections(server_id: string, channel_id: string, subreddit: string, score: number, total: number) {
    let weight = await SubredditScore(server_id, channel_id, subreddit)/4 + 0.5;
    subreddits[subreddit].score += score * weight;
    subreddits[subreddit].total += total * weight;
    writeFileSync(__dirname + '/../../../public/subreddits.json', JSON.stringify(subreddits, null));
}

export async function SubredditScore(server_id: string, channel_id: string, subreddit: string): Promise<number> {
    const Channel = await GetChannel(server_id, channel_id);

    // Find weighted upvote/downvote ratio
    const sub = Channel.subreddits[subreddit];
    const base_score = sub ? (sub.score + 2) / (sub.total + 8) : 0;

    // Add to score based on upvoted connections
    const sub_data = SubredditConnections(subreddit);
    let connection_score = sub_data.connections.reduce((acc: number, cur: string) => {
        let sub = Channel.subreddits[cur];
        if(!sub) return acc;
        return acc + (sub.score + 2) / (sub.total + 8);
    }, 0);
    
    return base_score + connection_score;
}