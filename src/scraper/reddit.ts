import * as Reddit from 'reddit';
import * as Axios from 'axios';
import Post from '../post';
import { ChannelPreference } from '../database/preference';

require('dotenv').config();
/*
const reddit = new Reddit({
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    appId: process.env.ID,
    appSecret: process.env.SECRET
});*/
const axios = Axios.default;

const AllowedFileTypes = ['jpg', 'png', 'gif', 'jpeg', 'webp', 'mp4', 'mov', 'webm'];
const TrustedDomains = ['v.redd.it', 'i.redd.it', 'i.imgur.com', 'tenor.com'];

/**
 * Get list of posts, as well as final post in feed to iterate searches
 * @param subreddit Subreddit name to search
 * @param after Post in feed to start search at
 * @param search_videos Search for videos
 * @returns [List of valid posts, Final post in feed]
 */
export async function GetPosts(preference: ChannelPreference, subreddit: string, after: string): Promise<{ posts: Post[], after: string, error: string }> {
    const URL = `https://reddit.com/r/${subreddit}/top.json?t=week&limit=&${preference.allow_video ? '20' : '100'}${after ? '&after='+after : ''}`;
    const RedditResponse = await axios.get(URL).then(res => res.data).catch(() => undefined);

    if(!RedditResponse) return { posts: [], after: undefined, error: 'Internal error' };
    if(!RedditResponse.data.dist) return { posts: [], after: undefined, error: 'That subreddit doesn\'t exist!' };
    
    const Posts = RedditResponse.data.children;
    const ParsedPosts = await Posts.reduce(async (acc_promise: Promise<Post[]>, post: { data: any }) => {
        const PostData = post.data;
        const Acc = await acc_promise;
        let allowed_video = PostData.is_video ? preference.allow_video : true;
        let allowed_nsfw = PostData.over_18 ? preference.allow_nsfw : true;
        let allowed_domain = TrustedDomains.includes(PostData.domain);
        if(PostData.stickied || !allowed_video || !allowed_nsfw || !allowed_domain) {
            return Acc;
        }
        
        const PostObject: Post = {
            title: PostData.title,
            subreddit: PostData.subreddit,
            video: PostData.is_video,
            nsfw: PostData.over_18,
            time: PostData.created_utc,
            url: PostData.url
        };

        if(PostData.is_video) {
            let url = PostData.media.reddit_video.fallback_url;

            // Test image qualities to find highest discord sendable
            for(let size of ['480', '240', 'end']) {
                if(size == 'end') return Acc;

                let start = url.indexOf('DASH_') + 5;
                let end = url.indexOf('.mp4');
                url = url.slice(0, start) + size + url.slice(end);

                // Is current video length good
                let startt = Date.now();
                const length = await axios.head(url).then(res => parseInt(res.headers['content-length'])).catch(() => undefined);
                console.log(Date.now() - startt)
                if(!length) continue;
                if(length <= 8000000) break;
            }

            PostObject.url = url;
        }
        
        if(!AllowedFileTypes.includes(PostData.url.split(/\./g).slice(-1)[0])) return Acc;

        Acc.push(PostObject);
        return Acc;
    }, Promise.resolve([]));

    return {
        posts: ParsedPosts,
        after: RedditResponse.data.after,
        error: undefined
    }
}