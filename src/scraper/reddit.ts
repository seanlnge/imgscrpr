import * as Reddit from 'reddit';
import * as Axios from 'axios';
import Post from '../post';

require('dotenv').config();

const reddit = new Reddit({
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    appId: process.env.ID,
    appSecret: process.env.SECRET
});
const axios = Axios.default;

export async function get_post(subreddit: string, options: { [key: string]: any } = {}): Promise<Post | string> {
    options.limit = 1;
    let reddit_response = await reddit.get(`/r/${subreddit}/rising`, options).catch(() => undefined);
    
    // Make sure posts are images/videos
    let post = reddit_response.data.children.filter((p: any) =>
        (['jpg', 'png', 'gif', 'jpeg', 'webp', 'svg', 'webm'].includes(p.data.url.split(/[\.\/]/g).slice(-1)[0])
        || p.data.media)
    )[0];

    // Return post time if not valid
    if(!post) {
        if(reddit_response.data.children.length) {
            return reddit_response.data.children[0].data.name;
        }
        return undefined;
    }

    // Extract data from post list
    let url = post.data.url;
    if(post.data.is_video) {
        url = post.data.media.reddit_video.fallback_url;

        // Check if fallback url is valid
        if(!url.split(/[\.\/]/g).slice(-1)[0].includes('mp4')) {
            return post.data.name;
        }

        // Check if video length is discord-send-able
        for(let size of ['1080', '480', '360', '240', 'end']) {
            if(size == 'end') return post.data.name;

            // Lower video size
            let start = url.indexOf('DASH_') + 5;
            let end = url.indexOf('.mp4');
            url = url.slice(0, start) + size + url.slice(end);

            // Check if current video length is good
            const length = await axios.head(url).then(res =>
                parseInt(res.headers['content-length'])
            ).catch(() => 0);
            if(!length) continue;

            if(length <= 8000000) break;
        }
    } else {
        // Make sure image hosted on trusted site
        if(!['redd', 'imgur'].includes(url.split(/./g)[1].slice(0, 4))) {
            return post.data.name;
        }
        console.log(url)

        const length = await axios.head(url).then(res =>
            parseInt(res.headers['content-length'])
        );
        if(length > 8000000) return post.data.name;
    }

    // Parse and return
    return {
        title: post.data.title,
        subreddit,
        url,
        video: post.data.is_video,
        id: post.data.name
    };
}