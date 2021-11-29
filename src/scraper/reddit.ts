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

const ImageTypes = ['jpg', 'png', 'gif', 'jpeg'];

export async function get_posts(subreddit: string, after: number): Promise<Post[]> {
    let reddit_response = await reddit.get(`/r/${subreddit}/hot`, { count: 20 }).catch(err => console.log(err));
    if(!reddit_response) return [];
    
    // Parse list of posts
    return await reddit_response.data.children.reduce(async (unawaited_posts: Promise<any[]>, post: any) => {
        const posts = await unawaited_posts;

        // Check if post fits basic checks
        let is_image = ImageTypes.includes(post.data.url.split(/[\.\/]/g).slice(-1)[0]);
        let video = post.data.is_video;
        let timely = post.data.created_utc > after;
        if(!(is_image || video) || !timely || post.data.stickied) {
            return posts;
        }

        let url = post.data.url;

        // Handle post if video
        if(video) {
            url = post.data.media.reddit_video.fallback_url;
    
            // Is fallback url valid
            if(!url.split(/[\.\/]/g).slice(-1)[0].includes('mp4')) {
                return posts;
            }
            
            // Is video length discord-send-able
            for(let size of ['1080', '480', '360', '240', 'end']) {
                if(size == 'end') return posts;

                // Lower video size
                let start = url.indexOf('DASH_') + 5;
                let end = url.indexOf('.mp4');
                url = url.slice(0, start) + size + url.slice(end);

                // Is current video length good
                const length = await axios.head(url).then(res => parseInt(res.headers['content-length'])).catch(() => 0);
                if(!length) continue;
                
                // Is good
                if(length <= 8000000) break;
            }
        } 
        
        // Handle post if image
        else {
            // Is image hosted on trusted site
            if(!['redd', 'imgur'].includes(url.split(/\./g)[1].slice(0, 4))) {
                return posts;
            }

            // Is image discord-send-able
            const length = await axios.head(url).then(res => parseInt(res.headers['content-length'])).catch(err => 8000001);
            if(length > 8000000) return posts;
        }

        // Parse post and return
        posts.push({
            title: post.data.title,
            subreddit,
            url,
            video: post.data.is_video,
            nsfw: post.data.over_18,
            time: parseInt(post.data.created_utc)
        });
        return posts;
    }, Promise.resolve([]));
}