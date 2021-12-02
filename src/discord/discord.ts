import * as Discord from 'discord.js';
import { GetChannel } from '../database/preference';
require('dotenv').config();

import { SendHelpMessage, SendPremiumMessage } from './commands/static';
import { AddSubreddit, RemoveSubreddit, Reset, SendPost, SendSettings } from './commands/dynamic';

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
        activities: [{ name: 'for i.help or i.info', type: 'WATCHING' }],
        status: "online"
    });
});

Client.on("messageCreate", async msg => {
    if(msg.author.bot) return;
    if(!['i.', 'I.'].includes(msg.content.trim().slice(0, 2))) return;

    const message = msg.content.slice(2).split(/\s/g).filter(a => a.length != 0);
    const command = message[0].toLowerCase();
    const options = message.slice(1);

    // Base commands
    if(["help", "info"].includes(command)) await SendHelpMessage(msg);
    if(["upgrade", "premium"].includes(command)) await SendPremiumMessage(msg);
    if(["settings"].includes(command)) await SendSettings(msg);

    // Premium customizable commands
    const Channel = await GetChannel(msg.channelId);
    if(Channel.channel.commands["add"] == command) await AddSubreddit(msg, options);
    if(Channel.channel.commands["remove"] == command) await RemoveSubreddit(msg, options);
    if(Channel.channel.commands["send"] == command) await SendPost(msg, options);
    if(Channel.channel.commands["reset"] == command) await Reset(msg);
});

export function login() {
    Client.login(process.env.TOKEN);
}