import Post from '../post';

const CachedPosts: { [key: string]: Post[] } = {};

export function get_post(subreddit: string, after: string): Post {
    if(!(subreddit in CachedPosts)) return undefined;

    // Compare post ids
    let time = parseInt(after.slice(3), 36);
    let post = CachedPosts[subreddit].find(post => time < parseInt(post.id.slice(3), 36));
    return post;
}

export function add_post(subreddit: string, post: Post) {
    // Create subreddit if non-existent
    if(!(subreddit in CachedPosts)) {
        CachedPosts[subreddit] = [post];
        return;
    }

    // Verify cached data is not too large
    let sub = CachedPosts[subreddit];
    if(sub.length > 500) sub.shift();

    sub.push(post);
}