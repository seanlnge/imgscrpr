import * as Discord from 'discord.js';
import { scrape } from '../feed/scraper/scraper';
import * as Preference from '../preference/preference';
import Post from '../post'

require('dotenv').config();

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
});

client.on("messageCreate", async msg => {
    if(msg.author.bot) return;

    if(msg.content == "/image") {
        const server: Preference.Preference = await Preference.get_server_pref(msg.channel.id);
        const post: { post: Post, score: number }  = await scrape(server);

        const message = await msg.channel.send({ files: [post.post.url] }).catch(async err => await msg.channel.send(post.post.url));
        await message.react('🟢');
        await message.react('🔴');

        let subreddit = Preference.get_subreddit(post.post.subreddit, server);
        if(!subreddit) {
            subreddit = { subreddit: post.post.subreddit, upvotes: 0, downvotes: 0, previous_post: post.post.id };
            await Preference.insert(msg.channel.id, subreddit);
        }

        subreddit.previous_post = post.post.id;
        await Preference.update(msg.channel.id, subreddit.subreddit, subreddit);
        
        const collector = message.createReactionCollector({
            filter: (reaction, user) => !user.bot && ['🟢', '🔴'].includes(reaction.emoji.name),
            time: 3600000,
            dispose: true,
        });
        collector.on('collect', async reaction => {
            if(reaction.emoji.name == '🟢') subreddit.upvotes++;
            if(reaction.emoji.name == '🔴') subreddit.downvotes++;
            
            await Preference.update(msg.channel.id, subreddit.subreddit, subreddit);
        });
        collector.on('remove', async reaction => {
            if(reaction.emoji.name == '🟢') subreddit.upvotes--;
            if(reaction.emoji.name == '🔴') subreddit.downvotes--;
            
            await Preference.update(msg.channel.id, subreddit.subreddit, subreddit);
        });
    }

    if(msg.content == "reset") {
        await Preference.reset(msg.channel.id);
    }
});

export function login() {
    client.login(process.env.TOKEN);
}