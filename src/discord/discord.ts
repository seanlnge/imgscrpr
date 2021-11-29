import * as Discord from 'discord.js';
import { GetChannel } from '../database/preference';
require('dotenv').config();

import { AddSubreddit, RemoveSubreddit } from './commands/subreddits';
import { SendHelpMessage, SendPremiumMessage } from './commands/main';
import { SendPost } from './commands/send';
import { Reset } from './commands/reset';

const Client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

Client.on("ready", () => {
    console.log(`Logged in as ${Client.user.tag}!`);
    Client.user.setPresence({
        activities: [{ name: 'for .i help or .i info', type: 'WATCHING' }],
        status: "online"
    });
});

Client.on("messageCreate", async msg => {
    if(msg.author.bot) return;
    if(!['.i ', '.I '].includes(msg.content.trim().slice(0, 3))) return;

    const message = msg.content.slice(3).split(/\s/g);
    message.filter(a => a.length != 0);

    // Base commands
    if(["help", "info"].includes(message[0])) await SendHelpMessage(msg);
    if(["upgrade", "premium"].includes(message[0])) await SendPremiumMessage(msg);

    // Premium customizable commands
    const Channel = await GetChannel(msg.channelId);
    if(Channel.channel.commands["add"] == message[0]) await AddSubreddit(msg, message[1].replace(/(r\/|\/)/g, ""));
    if(Channel.channel.commands["remove"] == message[0]) await RemoveSubreddit(msg, message[1].replace(/(r\/|\/)/g, ""));
    if(Channel.channel.commands["send"] == message[0]) await SendPost(msg);
    if(Channel.channel.commands["reset"] == message[0]) await Reset(msg);
});

export function login() {
    Client.login(process.env.TOKEN);
}