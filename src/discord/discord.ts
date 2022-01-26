import * as Discord from 'discord.js';
import { GetChannel } from '../database/preference';
require('dotenv').config();

import { SendHelpMessage, SendPremiumMessage } from './commands/static';
import { AddSubreddit, RemoveSubreddit, Reset } from './commands/dynamic/preference';
import { SendPost } from './commands/dynamic/send';
import { SendSettings } from './commands/dynamic/settings';
import { Administrators } from './commands/dynamic/permissions';
import { ChannelIsPremium, Stats, Subreddits } from './commands/premium/static';
import { UpdateUser } from './commands/premium/subscription';
import { Reactions } from './commands/premium/reactions';

export const Client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MEMBERS,
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
    if(["help", "info"].includes(command)) {
        await SendHelpMessage(msg, options);
        return;
    }
    if(["upgrade", "premium"].includes(command)){
        await SendPremiumMessage(msg, options);
        return;
    }

    // Premium customizable commands
    const Channel = await GetChannel(msg.guildId, msg.channelId);

    if(!Channel.channel.administrators.users.includes(msg.author.id)
    && !msg.member.roles.cache.hasAny(...Channel.channel.administrators.roles)
    && !msg.member.permissions.has("ADMINISTRATOR")) {
        await msg.reply("You don't have valid administrator permissions!");
        return;
    }

    if(command == "add") await AddSubreddit(msg, options);
    if(command == "remove") await RemoveSubreddit(msg, options);
    if(command == "send") await SendPost(msg, options);
    if(command == "reset") await Reset(msg);
    if(command == "settings" || command == "options") await SendSettings(msg);
    if(command == "admin" || command == "admins") await Administrators(msg, options); 

    if(!await ChannelIsPremium(msg.guildId, msg.channelId)) return;
    if(command == "stats" || command == "statistics") await Stats(msg);
    if(command == "subs" || command == "subreddits") await Subreddits(msg, options);
    if(command == "reactions" || command == "reaction") await Reactions(msg, options);
});

// For adding members to premium if Patreon bot gives them role
const PremiumRoles = {
    "918282525544157195": [{ type: "server", guild_id: undefined }],
    "918282364466135041": Array(4).fill({ type: "channel", guild_id: undefined, channel_id: undefined }),
    "918282071275876353": [{ type: "channel", guild_id: undefined, channel_id: undefined }]
}
Client.on("guildMemberUpdate", async (prev: Discord.GuildMember, curr: Discord.GuildMember) => {
    if(prev.guild.id != process.env.SUPPORT_SERVER) return; // Support server id
    if(prev.roles.cache.reduce((a,c) => a+c.id, "") == curr.roles.cache.reduce((a,c) => a+c.id, "")) return;
    
    const roleId = curr.roles.cache.difference(prev.roles.cache).keys().next().value;
    if(!(roleId in PremiumRoles)) return;

    await UpdateUser(curr.id, PremiumRoles[Object.keys(PremiumRoles).find(a => curr.roles.cache.get(a))] || []);

    return;
});

export async function login() {
    await Client.login(process.env.TOKEN);

    // Fetch members from premium support guild
    await (await Client.guilds.fetch(process.env.SUPPORT_SERVER)).members.fetch();
}