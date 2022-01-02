import * as Axios from 'axios';
import Post from '../post';
import { ChannelPreference } from '../database/preference';
require('dotenv').config();

const axios = Axios.default;

const AllowedFileTypes = ['jpg', 'png', 'gif', 'jpeg', 'webp', 'mp4', 'mov', 'webm'];
const TrustedDomains = ['v.redd.it', 'i.redd.it', 'i.imgur.com', 'tenor.com'];

/**
 * Get list of posts, as well as final post in feed to iterate searches
 * @param subreddit Subreddit name to search
 * @param after Post in feed to start search at
 * @returns [List of valid posts, Final post in feed]
 */
export async function GetPosts(preference: ChannelPreference, subreddit: string, after: string): Promise<{ posts: Post[], after: string, error: string }> {
    const URL = `https://reddit.com/r/${subreddit}/hot.json?limit=${preference.allow_video ? '20' : '100'}${after ? '&after='+after : ''}`;
    const RedditResponse = await axios.get(URL).then(res => res.data).catch(err => {
        switch(err.response.data.reason) {
            case 'private': return 'That subreddit is private!';
            case 'banned': return 'That subreddit has been banned!';
            default: return 'We\'ve had an internal error! Try again';
        }
    });

    if(typeof RedditResponse == "string") return { posts: [], after: undefined, error: RedditResponse  };
    if(!RedditResponse.data.dist) return { posts: [], after: undefined, error: 'That subreddit doesn\'t exist!' };
    
    const Posts = RedditResponse.data.children;
    const ParsedPosts = await Posts.reduce(async (acc_promise: Promise<Post[]>, post: { data: any }) => {
        const PostData = post.data;
        const Acc = await acc_promise;
        let allowed_nsfw = PostData.over_18 ? preference.allow_nsfw : true;
        let allowed_domain = TrustedDomains.includes(PostData.domain);
        if(PostData.stickied || !allowed_nsfw) {
            return Acc;
        }

        let type =
            PostData.post_hint == 'image' ? 'image':
            PostData.is_video ? 'video':
            PostData.is_self ? 'text':
            undefined;

        const PostObject: Post = {
            title: PostData.title,
            subreddit: PostData.subreddit.toLowerCase(),
            type,
            nsfw: PostData.over_18,
            time: PostData.created_utc,
            data: undefined,
            url: 'https://reddit.com' + PostData.permalink,
            id: PostData.id
        };

        if(type == "image") {
            if(!allowed_domain) return Acc;

            PostObject.data = PostData.url;
            if(!AllowedFileTypes.includes(PostObject.data.split(/\./g).slice(-1)[0])) return Acc;
        }

        else if(type == "video") {
            if(!preference.allow_video || !allowed_domain) return Acc;

            let url = PostData.media.reddit_video.fallback_url;

            // Test image qualities to find highest discord sendable
            for(let size of ['480', '240', 'end']) {
                if(size == 'end') return Acc;

                let start = url.indexOf('DASH_') + 5;
                let end = url.indexOf('.mp4');
                url = url.slice(0, start) + size + url.slice(end);

                // Is current video length good
                const length = await axios.head(url).then(res => parseInt(res.headers['content-length'])).catch(() => undefined);
                if(!length) continue;
                if(length <= 8000000) break;
            }

            PostObject.data = url;
        }

        else if(type == "text") {
            PostObject.data = PostData.selftext;
        }

        else return Acc;
        

        Acc.push(PostObject);
        return Acc;
    }, Promise.resolve([]));

    return {
        posts: ParsedPosts,
        after: RedditResponse.data.after,
        error: undefined
    }
}