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
    let image = reddit_response.data.children.filter((post: any) =>
        (['jpg', 'png', 'gif', 'jpeg', 'webp', 'svg', 'webm'].includes(post.data.url.split(/[\.\/]/g).slice(-1)[0])
        || post.data.media)
    )[0];

    // Return post time if not valid
    if(!image) {
        if(reddit_response.data.children.length) {
            return reddit_response.data.children[0].data.name;
        }
        return undefined;
    }

    // Extract data from post list
    let url = image.data.url;
    if(image.data.is_video) {
        url = image.data.media.reddit_video.fallback_url;

        // Check if fallback url is valid
        if(!url.split(/[\.\/]/g).slice(-1)[0].includes('mp4')) {
            return image.data.name;
        }

        // Check that video length is discord-send-able
        const length = await axios.head(url).then(res =>
            parseInt(res.headers['content-length'])
        );

        for(let size of ['1080', '480', '360', '240', 'end']) {
            if(size == 'end') return image.data.name;

            // Lower video size
            let start = url.indexOf('DASH_') + 5;
            let end = url.indexOf('.mp4');
            url = url.slice(0, start) + size + url.slice(end);

            // Check that video length is discord-send-able
            const length = await axios.head(url).then(res =>
                parseInt(res.headers['content-length'])
            ).catch(() => 0);
            if(!length) continue;

            if(length < 8000000) { console.log(length); break; };
        }
    } else {
        // Make sure image hosted on reddit
        if(url.split('//i.')[0].slice(0, 6) != 'reddit') {
            return image.data.name;
        }
    }

    // Parse and return
    return {
        title: image.data.title,
        subreddit,
        url,
        video: image.data.is_video,
        id: image.data.name
    };
}