import Post from '../post';
import * as NodeCache from "node-cache";

const Cache = new NodeCache();

export function Add(subreddit: string, posts: Post[]) {
    // Move previous posts to front of list
    if(Cache.has(subreddit)) {
        let prev: Post[] = Cache.get(subreddit);
        posts.unshift(...prev);
    }
    Cache.set(subreddit, posts);
}

export function Get(subreddit: string, ids: { [key: string]: number }): Post {
    if(!Cache.has(subreddit)) return;

    // Remove untimely posts
    let posts: Post[] = Cache.get(subreddit);
    posts = posts.filter(a => Date.now() - a.time*1e3 < 86400e3);

    Cache.set(subreddit, posts);

    return posts.find(a => !(a.id in ids));
}