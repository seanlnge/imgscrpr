import * as Reddit from 'reddit';
import Post from '../../post';

require('dotenv').config();

const reddit = new Reddit({
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    appId: process.env.ID,
    appSecret: process.env.SECRET
});

export async function get_post(subreddit: string, options: { [key: string]: any } = {}): Promise<Post | string> {
    options.limit = 1;
    let reddit_response = await reddit.get(`/r/${subreddit}/rising`, options).catch(() => undefined);
    
    // Make sure posts are images/videos
    let image = reddit_response.data.children.filter((post: any) =>
        (['jpg', 'png', 'gif', 'jpeg', 'webp', 'svg', 'webm'].includes(post.data.url.split(/[\.\/]/g).slice(-1)[0])
        || post.data.media)
    )[0];

    // Return post time if not valid
    if(!image) return reddit_response.data.children[0].data.name;

    // Extract data from post list
    let url = image.data.url;
    if(image.data.is_video) {
        url = image.data.media.reddit_video.fallback_url;
        if(!url.split(/[\.\/]/g).slice(-1)[0].includes('mp4')) {
            return image.data.name;
        }
    }
    return {
        title: image.data.title,
        subreddit,
        thumbnail_url: image.data.thumbnail,
        url,
        id: image.data.name
    };
}