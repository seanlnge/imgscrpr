import * as Discord from 'discord.js';
import { GetChannel } from '../database/preference';
require('dotenv').config();

import { SendHelpMessage, SendPremiumMessage } from './commands/static';
import { AddSubreddit, RemoveSubreddit, Reset } from './commands/dynamic/preference';
import { SendPost } from './commands/dynamic/send';
import { SendSettings } from './commands/dynamic/settings';
import { Administrators } from './commands/dynamic/permissions';
import { ChannelIsPremium, List, Stats } from './commands/dynamic/premium';

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
    const options = message.slice(1).map(x => x.toLowerCase());

    // Base commands
    if(["help", "info"].includes(command)) await SendHelpMessage(msg);
    if(["upgrade", "premium"].includes(command)) await SendPremiumMessage(msg, options);

    // Premium customizable commands
    const Channel = await GetChannel(msg.guildId, msg.channelId);

    if(!Channel.channel.administrators.users.includes(msg.author.id)
    && !msg.member.roles.cache.hasAny(...Channel.channel.administrators.roles)
    && !msg.member.permissions.has("ADMINISTRATOR")) {
        await msg.reply("You don't have valid administrator permissions!");
        return;
    }

    if(Channel.channel.commands["add"] == command) await AddSubreddit(msg, options);
    if(Channel.channel.commands["remove"] == command) await RemoveSubreddit(msg, options);
    if(Channel.channel.commands["send"] == command) await SendPost(msg, options);
    if(Channel.channel.commands["reset"] == command) await Reset(msg);
    if(Channel.channel.commands["settings"] == command) await SendSettings(msg);
    if(Channel.channel.commands["admin"] == command) await Administrators(msg, options); 

    if(!await ChannelIsPremium(msg.guildId, msg.channelId)) return;
    if(command == "stats" || command == "statistics") await Stats(msg);
    if(command == "list" || command == "subreddits") await List(msg, options);
});

export function login() {
    Client.login(process.env.TOKEN);
}

// For adding members to premium if Patreon bot gives them role
const PremiumRoles = {
    "918282525544157195": [{ type: "server", id: undefined }],
    "918282364466135041": Array(4).fill({ type: "channel", id: undefined }),
    "918282071275876353": { type: "channel", id: undefined }
}
Client.on("guildMemberUpdate", (prev: Discord.GuildMember, curr: Discord.GuildMember) => {
    if(prev.guild.id != "913829500255608853") return; // Support server id
    if(prev.roles.cache.reduce((a,c) => a+c.id, "") != curr.roles.cache.reduce((a,c) => a+c.id, "")) return;

    const difference = curr.roles.cache.size - prev.roles.cache.size;
    if(difference == 1) {
        const roleId = curr.roles.cache.difference(prev.roles.cache).keys()[0];
        console.log(roleId)
        if(!(roleId in PremiumRoles)) return;
    }
    if(difference == -1) {
        const roleId = curr.roles.cache.difference(prev.roles.cache).keys()[0];
        console.log(roleId)
        if(!(roleId in PremiumRoles)) return;

    }
    if(difference == 0) {
        const roleId = curr.roles.cache.difference(prev.roles.cache).keys()[0];
        console.log(roleId)
        if(!(roleId in PremiumRoles)) return;
    }

});