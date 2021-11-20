import Post from '../post';

const CachedPosts: { [key: string]: Post[] } = {};

export function get_post(subreddit: string, after: number): Post {
    if(!(subreddit in CachedPosts)) return undefined;
    let post = CachedPosts[subreddit].find(post => after < post.time);
    return post;
}

export function add_posts(subreddit: string, posts: Post[]) {
    // Create subreddit if non-existent
    if(!(subreddit in CachedPosts)) {
        CachedPosts[subreddit] = posts;
        return;
    }

    // Verify cached data is not too large
    let sub = CachedPosts[subreddit];
    posts.sort((a, b) => a.time - b.time);
    sub.push(...posts);
    if(sub.length > 500) sub.splice(0, sub.length - 500);
}