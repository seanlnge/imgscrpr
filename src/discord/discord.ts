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
import { Presets } from './commands/premium/presets';

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

Client.on("messageCreate", async (msg): Promise<any> => {
    if(msg.author.bot) return;
    if(!['i.', 'I.'].includes(msg.content.trim().slice(0, 2))) return;

    const message = msg.content.slice(2).split(/\s/g).filter(a => a.length != 0);
    const command = (message[0] || '').toLowerCase();
    const options = message.slice(1).map(x => x.toLowerCase());

    // Base commands
    if(["help", "info"].includes(command)) return await SendHelpMessage(msg, options);
    if(["upgrade", "premium"].includes(command)) return await SendPremiumMessage(msg, options);

    // Premium customizable commands
    const Channel = await GetChannel(msg.guildId, msg.channelId);
    const premium = await ChannelIsPremium(msg.guildId, msg.channelId);
    const admin = Channel.channel.administrators.users.includes(msg.author.id)
        || msg.member.roles.cache.hasAny(...Channel.channel.administrators.roles)
        || msg.member.permissions.has("ADMINISTRATOR"); 
      
    // Read only commands
    if(!Channel.channel.extra_commands && !admin) return await msg.reply("You don't have valid administrator permissions!").catch(() => undefined);
    
    if(command == "send") return await SendPost(msg, options);
    if(premium) {     
        if(command == "subs" || command == "subreddits") return await Subreddits(msg, options);
        if(command == "stats" || command == "statistics") return await Stats(msg);
        if(command == "preset" || command == "presets") return await Presets(msg, options);
    }

    // Write commands
    if(admin) {
        if(command == "add") return await AddSubreddit(msg, options);
        if(command == "remove") return await RemoveSubreddit(msg, options);
        if(command == "reset") return await Reset(msg);
        if(command == "settings" || command == "options") return await SendSettings(msg);
        if(command == "admin" || command == "admins") return await Administrators(msg, options); 

        if(premium) {
            if(command == "reactions" || command == "reaction") return await Reactions(msg, options);
        }
    }

    if(command in Channel.channel.presets) {
        return await Presets(msg, options, command);
    }

    return await msg.reply("Unknown command! Try `i.help` or `i.preset list` to find what you're looking for");
});

// For adding members to premium if Patreon bot gives them role
const PremiumRoles = {
    "939991009268494366": Array(5).fill({ type: "server", guild_id: undefined }),
    "939990869002567711": Array(2).fill({ type: "server", guild_id: undefined }),
    "918282525544157195": [{ type: "server", guild_id: undefined }],
    "918282364466135041": Array(3).fill({ type: "channel", guild_id: undefined, channel_id: undefined }),
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
Client.on("guildMemberAdd", async (user: Discord.GuildMember) => {
    if(user.guild.id != process.env.SUPPORT_SERVER) return; // Support server id

    await UpdateUser(user.id, PremiumRoles[Object.keys(PremiumRoles).find(a => user.roles.cache.get(a))] || []);
});

export async function login() {
    await Client.login(process.env.TOKEN);

    // Fetch members from premium support guild
    await (await Client.guilds.fetch(process.env.SUPPORT_SERVER)).members.fetch();
}