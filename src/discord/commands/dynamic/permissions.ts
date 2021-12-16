import * as Discord from 'discord.js'
import { GetChannel } from '../../../database/preference';

async function add(msg: Discord.Message, options: string[]) {
    if(!options[0]) options[0] = '';
    if(!['<@!', '<@&'].includes(options[0].slice(0, 3))) {
        return await msg.reply(`${options[0]} is not a valid parameter. Add a user/role by pinging them`);
    }

    const is_role = options[0][2] == '&'; // <@&1234> pings a role, <@!1234> pings a user
    const data = options[0].slice(3, -1); // Takes the 1234 from <@!1234>
    const Channel = await GetChannel(msg.guildId, msg.channelId);

    // Roles
    if(is_role) {
        if(Channel.channel.administrators.roles.includes(data)) {
            return await msg.reply(`Users with that role are already administrators`);
        }
        Channel.channel.administrators.roles.push(data);
        return await msg.reply(`Users with that role are now administrators`);
    }
    
    // Users
    else {
        if(Channel.channel.administrators.users.includes(data)) {
            return await msg.reply(`That user is already an administrator`);
        }
        Channel.channel.administrators.users.push(data);
        return await msg.reply(`That user is now an administrator`);
    }
}

async function remove(msg: Discord.Message, options: string[]) {
    if(!options[0]) options[0] = '';
    if(!['<@!', '<@&'].includes(options[0].slice(0, 3))) {
        return await msg.reply(`${options[0]} is not a valid parameter. Remove a user/role by pinging them`);
    }

    const is_role = options[0][2] == '&';
    const data = options[0].slice(3, -1);
    const Channel = await GetChannel(msg.guildId, msg.channelId);

    // Roles
    if(is_role) {
        if(!Channel.channel.administrators.roles.includes(data)) {
            return await msg.reply(`Users with that role are not administrators`);
        }
        let index = Channel.channel.administrators.roles.findIndex(a => a == data);
        Channel.channel.administrators.roles.splice(index);
        return await msg.reply(`Users with that role are no longer administrators`);
    }
    
    // Users
    else {
        if(!Channel.channel.administrators.users.includes(data)) {
            return await msg.reply(`That user is not an administrator`);
        }
        let index = Channel.channel.administrators.roles.findIndex(a => a == data);
        Channel.channel.administrators.users.splice(index);
        return await msg.reply(`That user is no longer an administrator`);
    }
}

export async function Administrators(msg: Discord.Message, options: string[]) {
    if(options[0] == 'add') return add(msg, options.slice(1));
    if(options[0] == 'remove') return remove(msg, options.slice(1));
    
    await msg.reply(`Sorry, '${options[0] || ''}' is not a valid editing option. Please choose either 'add' or 'remove'`);
}