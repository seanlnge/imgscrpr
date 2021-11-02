import Collection from '@discordjs/collection';
import { MongoClient, ReadPreferenceMode } from 'mongodb';

require('dotenv').config();

const uri = `mongodb+srv://seanLange:${process.env.MONGO_PASS}@cluster0.ux4by.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {});

function PREF_INIT(): Preference {
    return [
        { subreddit: "ihaveihaveihavereddit", upvotes: 0, downvotes: 0, previous_post: undefined },
        { subreddit: "comedynecrophilia", upvotes: 0, downvotes: 0, previous_post: undefined },
        { subreddit: "memes", upvotes: 0, downvotes: 0, previous_post: undefined }
    ];
}
export type Preference = {
    subreddit: string,
    upvotes: number,
    downvotes: number,
    previous_post: string,
}[];

export function get_subreddit(subreddit: string, preference: Preference) {
    return preference.find(a => a.subreddit == subreddit);
}

export async function connect_db() {
    await client.connect();
}

export async function get_server_pref(server_id: string) {
    let pref = await client.db("preferences").collection(server_id).find().toArray() as Preference;
    if(pref.length == 0) {
        pref = PREF_INIT();
        await client.db("preferences").collection(server_id).insertMany(pref);
    }
    return pref;
}

export async function reset(server_id: string) {
    await client.db("preferences").collection(server_id).deleteMany({});
    await client.db("preferences").collection(server_id).insertMany(PREF_INIT());
}

export async function insert(server_id: string, data: Preference[0]) {
    await client.db("preferences").collection(server_id).insertOne(data);
}

export async function update(server_id: string, subreddit: string, data: Preference[0]) {
    await client.db("preferences").collection(server_id).updateOne({ subreddit }, { $set: data });
}