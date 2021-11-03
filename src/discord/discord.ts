import * as Discord from 'discord.js';
import { scrape } from '../feed/scraper/scraper';
import * as Preference from '../preference/preference';
import { sr_score } from '../feed/processer/subreddits';
import Post from '../post'

require('dotenv').config();

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
});

client.on("messageCreate", async msg => {
    if(msg.author.bot) return;

    let preference = await Preference.get_server_pref(msg.channel.id);

    if(msg.content.slice(0, 4) == "/add") {
        let top_sub_name = preference.reduce((a, c) => {
            let score = Math.max(a.score, sr_score(c.subreddit, preference));
            let subreddit = score == a.score ? a.subreddit : c.subreddit;
            return { subreddit, score }
        }, { subreddit: "", score: -1/0 });

        let top_sub = Preference.get_subreddit(top_sub_name.subreddit, preference);

        let subreddit = {
            subreddit: msg.content.slice(5).trim(),
            upvotes: top_sub.upvotes + 2,
            downvotes: top_sub.downvotes,
            previous_post: undefined
        };

        if(Preference.get_subreddit(msg.content.slice(5), preference)) {
            await Preference.update(msg.channel.id, subreddit);
        } else {
            await Preference.insert(msg.channel.id, subreddit);
        }
    }

    if(msg.content == "/image") {
        const server: Preference.Preference = await Preference.get_server_pref(msg.channel.id);
        const post: { post: Post, score: number }  = await scrape(server);

        let format_sub = '/r/' + post.post.subreddit;
        const embed = new Discord.MessageEmbed();
        embed.setTitle(format_sub).setURL('https://reddit.com' + format_sub);
        embed.setDescription(post.post.title);
        embed.setImage(post.post.url);
        const message = await msg.channel.send({ embeds: [embed] });

        await message.react('🟢');
        await message.react('🔴');

        let subreddit = Preference.get_subreddit(post.post.subreddit, server);
        if(!subreddit) {
            subreddit = { subreddit: post.post.subreddit, upvotes: 0, downvotes: 0, previous_post: post.post.id };
            await Preference.insert(msg.channel.id, subreddit);
        }

        subreddit.previous_post = post.post.id;
        await Preference.update(msg.channel.id, subreddit);
        
        const collector = message.createReactionCollector({
            filter: (reaction, user) => !user.bot && ['🟢', '🔴'].includes(reaction.emoji.name),
            time: 3600000,
            dispose: true,
        });
        collector.on('collect', async reaction => {
            if(reaction.emoji.name == '🟢') subreddit.upvotes++;
            if(reaction.emoji.name == '🔴') subreddit.downvotes++;
            
            await Preference.update(msg.channel.id, subreddit);
        });
        collector.on('remove', async reaction => {
            if(reaction.emoji.name == '🟢') subreddit.upvotes--;
            if(reaction.emoji.name == '🔴') subreddit.downvotes--;
            
            await Preference.update(msg.channel.id, subreddit);
        });
    }

    if(msg.content == "/reset") {
        await Preference.reset(msg.channel.id);
    }
});

export function login() {
    client.login(process.env.TOKEN);
}