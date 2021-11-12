import * as Discord from 'discord.js';
import { scrape } from '../scraper/scraper';
import * as Preference from '../database/preference';
import { sr_score } from '../scraper/subreddits';
import Post from '../post'

require('dotenv').config();

const Reactions = {
    '🟢': 1,
    '🟡': 0.5,
    '🟠': -0.5,
    '🔴': -1,
}

const Client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

Client.on("ready", () => {
    console.log(`Logged in as ${Client.user.tag}!`)
});

Client.on("messageCreate", async msg => {
    if(msg.author.bot) return;

    let preference = await Preference.get_server_pref(msg.channel.id);

    if(msg.content.slice(0, 4) == "/add") {
        // Get top subreddit in preference
        let top_sub_name = preference.reduce((a, c) => {
            let score = Math.max(a.score, sr_score(c.subreddit, preference));
            let subreddit = score == a.score ? a.subreddit : c.subreddit;
            return { subreddit, score }
        }, { subreddit: "", score: -1/0 });

        let top_sub = Preference.get_subreddit(top_sub_name.subreddit, preference);

        // Create new subreddit
        let subreddit = {
            subreddit: msg.content.slice(5).trim(),
            score: top_sub.score + 2,
            total: top_sub.total,
            previous_post: undefined
        };

        preference.push(subreddit);
    }
    if(msg.content.slice(0, 7) == '/remove') {
        delete preference[msg.content.slice(7).trim()];
    }

    if(msg.content == "/image") {
        const server: Preference.Preference = await Preference.get_server_pref(msg.channel.id);
        const data: { post: Post, score: number }  = await scrape(server);

        // Create embeded message
        let format_sub = '/r/' + data.post.subreddit;
        const embed = new Discord.MessageEmbed();
        embed.setTitle(format_sub).setURL('https://reddit.com' + format_sub);
        embed.setDescription(data.post.title);

        // Discord doesn't allow for embed videos
        if(!data.post.video) embed.setImage(data.post.url);
        const Message = await msg.channel.send({
            embeds: [embed],
            files: data.post.video ?
                [data.post.url] : []
        });
        
        // Send all reactions
        for(let reaction in Reactions) {
            await Message.react(reaction);
        }

        // Get/create subreddit data in channel preference
        let subreddit = Preference.get_subreddit(data.post.subreddit, server);
        if(!subreddit) {
            subreddit = { subreddit: data.post.subreddit, score: 0, total: 0, previous_post: data.post.id };
            await Preference.insert(msg.channel.id, subreddit);
        } else {
            subreddit.previous_post = data.post.id;
        }
        
        // Collect reactions
        const Collector = Message.createReactionCollector({
            filter: (reaction, user) => !user.bot && reaction.emoji.name in Reactions,
            time: 1200000,
            dispose: true,
        });

        // On reaction add
        Collector.on('collect', async reaction => {
            let score = Reactions[reaction.emoji.name];
            if(!score) return;

            subreddit.score += score;
            subreddit.total++;
        });

        // On reaction remove
        Collector.on('remove', async reaction => {
            let score = Reactions[reaction.emoji.name];
            if(!score) return;

            subreddit.score -= score;
            subreddit.total--;
        });

        // At end of 20 minutes update database
        Collector.on("end", async () => {
            await Preference.update(msg.channel.id, subreddit.subreddit);
        });
    }

    // Reset all subreddit's data
    if(msg.content == "/reset") {
        await Preference.reset(msg.channel.id);
    }
});

export function login() {
    Client.login(process.env.TOKEN);
}