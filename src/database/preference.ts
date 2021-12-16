import { MongoClient } from 'mongodb';

require('dotenv').config();

const uri = `mongodb+srv://seanLange:${process.env.MONGO_PASS}@cluster0.ux4by.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
export const Client = new MongoClient(uri, {});

class Preference {
    initialize: () => Preference;

    constructor(public subreddits: { [key: string]: SubredditData }, public channel: ChannelPreference, public statistics: Statistics) {}
    
    AddSubreddit(
        subreddit: string,
        score: number = 0,
        total: number = 0,
        previous_post_utc: number = 0,
        last_accessed: number = 0
    ){
        this.subreddits[subreddit] = {
            score,
            total,
            previous_post_utc,
            last_accessed
        };
    }

    /**
     * Find name of subreddit last accessed by Discord
     * @returns Name of subreddit last accessed
     */
    LastAccessed(): string {
        const sorted = Object.keys(this.subreddits).sort((a, b) =>
            this.subreddits[b].last_accessed - this.subreddits[a].last_accessed
        );

        if(this.subreddits[sorted[0]].last_accessed == 0) return undefined;

        return sorted[0];
    }
}

Preference.prototype.initialize = (subreddits: string[] = [
    "thatsinsane", "memes", "gayspiderbrothel"
]): Preference => {
        const parsed_subreddits = {};

        for(let subreddit of subreddits) {
            parsed_subreddits[subreddit] = {
                score: 0,
                total: 0,
                previous_post_utc: 0,
                last_accessed: 0
            };
        }

        const channel_preference = {
            last_accessed: 0,
            premium: false,
            allow_nsfw: false,
            allow_video: true,
            voters: true,
            administrators: { users: [], roles: [] },
            commands: {
                'send': 'send',
                'reset': 'reset',
                'add': 'add',
                'remove': 'remove',
                'settings': 'settings',
                'admin': 'admin'
            },
            reactions: {
                '🟢': 1,
                '🔴': -1
            }
        };

        const statistics = {
            posts: 0,
            score: 0,
            votes: 0,
        };

        return new Preference(parsed_subreddits, channel_preference, statistics);
}

export type ChannelPreference = {
    last_accessed: number,
    premium: boolean,
    allow_nsfw: boolean,
    allow_video: boolean,
    administrators: { users: string[], roles: string[] },
    commands: { [key: string]: string },
    reactions: { [key: string]: number }
}

export type Statistics = {
    posts: number,
    score: number,
    votes: number
}

export type SubredditData = {
    score: number,
    total: number,
    previous_post_utc: number,
    last_accessed: number,
};

export const WorkingPreferences: { [key: string]: Preference } = {};

function server(id: string) {
    return Client.db("servers").collection(id);
}

async function initialize_channel(server_id: string, channel_id: string) {
    // Create new preference
    WorkingPreferences[channel_id] = Preference.prototype.initialize();
    await UpdateChannel(server_id, channel_id);
}

export async function GetChannel(server_id: string, channel_id: string): Promise<Preference> {
    if(channel_id in WorkingPreferences) return WorkingPreferences[channel_id];

    // Find channel preference in db
    const channel = await server(server_id).findOne({ channel_id: { $eq: channel_id } });
    if(channel) {
        return WorkingPreferences[channel_id] = new Preference(channel.subreddits, channel.preference, channel.statistics);
    }
    
    await initialize_channel(server_id, channel_id);
    return WorkingPreferences[channel_id];
}

/**
 * Update subreddit data in database
 * @param id Discord channel ID
 * @param subreddit Subreddit name
 */
export async function UpdateChannel(server_id: string, channel_id: string) {
    await server(server_id).updateOne({ channel_id: { $eq: channel_id }}, { $set: {
        channel_id,
        subreddits: WorkingPreferences[channel_id].subreddits,
        preference: WorkingPreferences[channel_id].channel,
        statistics: WorkingPreferences[channel_id].statistics 
    }}, { upsert: true });
}

/**
 * Reset all preferences and data in channel
 * @param id Discord channel ID
 */
export async function ResetChannel(server_id: string, channel_id: string) {
    // Keep channel preferences
    let channel_preference = WorkingPreferences[channel_id].channel;
    await initialize_channel(server_id, channel_id);
    WorkingPreferences[channel_id].channel = channel_preference;
    
    await UpdateChannel(server_id, channel_id);
}

export async function connect_db() { await Client.connect() };