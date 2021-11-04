import Collection from '@discordjs/collection';
import { channel } from 'diagnostics_channel';
import { MongoClient, ReadPreferenceMode } from 'mongodb';

require('dotenv').config();

const uri = `mongodb+srv://seanLange:${process.env.MONGO_PASS}@cluster0.ux4by.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {});

function PREF_INIT(): Preference {
    return [
        { subreddit: "ihaveihaveihavereddit", upvotes: 0, downvotes: 0, previous_post: undefined },
        { subreddit: "memes", upvotes: 0, downvotes: 0, previous_post: undefined }
    ];
}
export type Preference = {
    subreddit: string,
    upvotes: number,
    downvotes: number,
    previous_post: string,
}[];

const WorkingPreferences: { [key: string]: Preference } = {};

export function get_subreddit(subreddit: string, preference: Preference) {
    return preference.find(a => a.subreddit == subreddit);
}

export async function connect_db() {
    await client.connect();
}

export async function get_server_pref(channel_id: string) {
    // Find channel in working preferences
    if(channel_id in WorkingPreferences) {
        return WorkingPreferences[channel_id];
    }

    // Find channel in database
    let pref = await client.db("preferences").collection(channel_id).find().toArray() as Preference;
    if(pref.length) {
        WorkingPreferences[channel_id] = pref;
        return pref;
    }

    // Create channel preference
    pref = PREF_INIT();
    await client.db("preferences").collection(channel_id).insertMany(pref);
    WorkingPreferences[channel_id] = pref;
    return pref;
}

export async function reset(channel_id: string) {
    WorkingPreferences[channel_id] = PREF_INIT();

    await client.db("preferences").collection(channel_id).deleteMany({});
    await client.db("preferences").collection(channel_id).insertMany(WorkingPreferences[channel_id]);

    return WorkingPreferences[channel_id];
}

export async function insert(channel_id: string, data: Preference[0]) {
    if(!(channel_id in WorkingPreferences)) {
        WorkingPreferences[channel_id] = await get_server_pref(channel_id); 
    }

    WorkingPreferences[channel_id].push(data);
}

export async function update(channel_id: string, subreddit: string) {
    const pref = WorkingPreferences[channel_id];
    if(!(subreddit in pref)) return;

    const sub = get_subreddit(subreddit, pref);
    await client.db("preferences").collection(channel_id).updateOne({ subreddit }, { $set: sub });
}