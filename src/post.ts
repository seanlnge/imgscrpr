export default interface Post {
    title: string,
    subreddit: string,
    nsfw: boolean,
    time: number,
    type: string,
    data: string,
    url: string,
    id: string
}