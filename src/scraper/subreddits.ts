import { readFileSync, writeFileSync } from 'fs';
import { GetChannel } from '../database/preference';

const subreddits = JSON.parse(readFileSync(__dirname + '/../../../public/subreddits.json', 'utf-8'));

export function SubredditConnections(subreddit: string) {
    return subreddits[subreddit] || { score: 0, total: 0, connections: [] };
}

export async function SubredditScore(server_id: string, channel_id: string, subreddit: string): Promise<number> {
    const Channel = await GetChannel(server_id, channel_id);

    // Find weighted upvote/downvote ratio
    const sub = Channel.subreddits[subreddit];
    const base_score = sub ? sub.score / (sub.total || 1) : 0;

    // Add to score based on upvoted connections
    const sub_data = SubredditConnections(subreddit);
    const connections = sub_data.connections.reduce((acc: { score: number, total: number }, cur: string) => {
        let sub = Channel.subreddits[cur];
        if(!sub) return acc;
        return { score: acc.score + sub.score, total: acc.total + sub.total };
    }, { score: 0, total: 0 });
    
    return base_score * ((connections.score / (connections.total || 1)) + 1);
}