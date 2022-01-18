# [imgscrpr](https://discord.com/api/oauth2/authorize?client_id=904018497657532447&permissions=27712&scope=bot)
An adaptive Reddit feed for you Discord server
***
### Introduction
Imgscrpr is an adaptive Reddit feed for your Discord server. It isn't only a simple Reddit bot, however. The attribute that sets it a step above the rest is its ability to mold to your users' preferences based on votes. Imgscrpr also gives you a wide variety of customizations to perfect the experience provided.

With the large number of features provided, its evident that Imgscrpr is the best Reddit bot to add to your Discord server
***
### Adaptiveness
The element that takes Imgscrpr a step above is adaptiveness. When users give the command `i.send` to get a Reddit post, Imgscrpr will look at the previous posts and automatically send the best posts to the channel.

#### How?
When a post is sent, Imgscrpr will react a green circle, a red circle, and a red X. Users can then vote on the post using the green and red circles, with green being good and red being bad. This data is then used by the bot to find the subreddits that fit the channel best. The red X means to delete the post and can only be done by administrators.

After a couple of posts, Imgscrpr will start to catch on to the topics that your channel users enjoy and will start sending posts from related subreddits. Users' votes reinforce or change these preferences, and will allow Imgscrpr to find better subreddits that will only further better user experience.

In other words, the more posts, the better Imgscrpr becomes.

#### Why?
There are many pros to having an adaptive Reddit bot. For one, it makes it very easy on your channel's users, as they don't have to choose which subreddits to send, and can instead get a personalized feed that fits them.
***
### Customization
Another amazing feature provided by Imgscrpr is a variety of customizations. Channel administrators can open up the settings panel with `i.settings` and change the specifics of what Imgscrpr sends, such as disallowing text posts or turning off NSFW posts. Admins can also edit channel preferences with `i.add {subreddit}` or `i.remove {subreddit}`, which will either add or remove a subreddit from the channel's personalized feed.
***
### Premium
Buying Imgscrpr Premium removes long rate limits and adds many perks from more customizations to new features. It amplifies your experience greatly and also supports us in hosting Imgscrpr and creating a better experience for everyone.

#### Tiny Rate Limit
Premium changes the waiting time between posts from 15 seconds to 2 seconds, allowing users to request new posts almost instantly.

#### Customizable Voting Reactions
Imgscrpr Premium gives the ability to edit the upvote/downvote reactions, as well as allowing you to an entirely new type of vote; say a vote button which counts as 7/12 of a vote - or a vote that counts as 3.23894839 downvotes, the possibilities are endless.

#### Statistics
Buying premium gives you exclusive access to specific statistics such as the average upvote-to-downvote ratio, or the top subreddits as voted by the channel members.
***
## Commands
Curly brackets contain parameters that need to be filled, question marks mean optional, and straight lines mean choose either/or.
* `i.send {subreddit}?` - Sends a post from either channel preferences or a particular subreddit
* `i.reset` - Resets the channel's preferences; Admin necessary
* `i.admin add|remove {@user|@role}` - Either give or revoke admin access to a user or role. Users with server administrator access will automatically have Imgscrpr admin.
* `i.settings` - Open up the settings panel; Admin necessary
* `i.add {subreddit}` - Add a subreddit to the top of your feed
* `i.remove {subreddit}` - Remove a subreddit from your feed
