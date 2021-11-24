import { MongoClient } from 'mongodb';

require('dotenv').config();

const uri = `mongodb+srv://seanLange:${process.env.MONGO_PASS}@cluster0.ux4by.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {});

class Preference {
    subreddits: { [key: string]: SubredditData };
    channel: ChannelPreference;

    constructor(subreddits: string[] = [
        "thatsinsane", "memes", "gayspiderbrothel"
    ]) {
        this.subreddits = {};

        for(let subreddit of subreddits) {
            this.subreddits[subreddit] = {
                score: 0,
                total: 0,
                previous_post_utc: 0,
                last_accessed: 0
            };
        }

        const channel_preference = {
            last_accessed: 0,
            commands: {
                'send': 'send',
                'reset': 'reset',
                'add': 'add',
                'remove': 'remove',
            },
            reactions: {
                '🟢': 1,
                '🔴': -1
            }
        };
        this.channel = channel_preference;
    }

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

export type ChannelPreference = {
    last_accessed: number,
    commands: { [key: string]: string },
    reactions: { [key: string]: number }
}

export type SubredditData = {
    score: number,
    total: number,
    previous_post_utc: number,
    last_accessed: number,
};

const WorkingPreferences: { [key: string]: Preference } = {};

function channel(id: string) {
    return client.db("preferences").collection(id);
}

async function initialize_channel(id: string) {
    // Create new preference
    WorkingPreferences[id] = new Preference();

    // Parse subreddits to insert into db
    const parsed_subreddits = [];
    for(const sub_name in WorkingPreferences[id].subreddits) {
        const sub = WorkingPreferences[id].subreddits[sub_name];
        parsed_subreddits.push({ subreddit: sub_name, ...sub })
    }

    // Push channel preference
    parsed_subreddits.push({ preference: true, ...WorkingPreferences[id].channel });
    await channel(id).insertMany(parsed_subreddits);
}

export async function GetChannel(id: string): Promise<Preference> {
    if(id in WorkingPreferences) return WorkingPreferences[id];

    // Find channel preference in db
    const preference = await channel(id).find({ preference: { $eq: true } }).toArray()[0];
    if(preference) {
        delete preference.preference;
        return preference;
    }

    await initialize_channel(id);
    return WorkingPreferences[id];
}

/**
 * Update subreddit data in database
 * @param id Discord channel ID
 * @param subreddit Subreddit name
 */
export async function UpdateSubredditData(id: string, subreddit: string) {
    await channel(id).updateOne(
        { subreddit: { $eq: subreddit } },
        { $set: WorkingPreferences[id].subreddits[subreddit] },
        { upsert: true }
    );
}

/**
 * Update channel preference in database
 * @param id Discord channel ID
 */
export async function UpdateChannelPreference(id: string) {
    await channel(id).updateOne(
        { is_preference: { $eq: true } },
        { $set: WorkingPreferences[id].channel },
        { upsert: true }
    );
}

/**
 * Reset all preferences and data in channel
 * @param id Discord channel ID
 */
export async function ResetChannel(id: string) {
    await channel(id).deleteMany({});
    delete WorkingPreferences[id];
}
   
export async function connect_db() { await client.connect() };