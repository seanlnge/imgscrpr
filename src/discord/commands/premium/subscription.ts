import { Client, GetChannel, UpdateChannel } from "../../../database/preference";
import * as Discord from "discord.js";
import { GetUser } from "./static";

export async function UpdateUser(user_id: string, data: { [key: string]: string }[]) {
    if(data.length == 0) {
        return await Client.db("premium").collection(user_id).drop();
    }

    const user = await Client.db("premium").collection(user_id).findOne();
    if(user) {
        // Move any previous subscriptions into new data
        data = data.map(curr => {
            let index = user.subscriptions.findIndex(a => curr.type == a.type && a.guild_id);
            if(index == -1) return curr;
            return user.subscriptions.splice(index, 1)[0];
        });

        // Remove premium from other subscriptions
        for(const subscription of user.subscriptions) {
            if(!subscription.guild_id) continue;

            if(subscription.type == "server") {
                await Client.db("servers").collection(subscription.guild_id).updateOne(
                    { premium: { $eq: true } }, { $set: { premium: false }}
                );
            } else if(subscription.type == "channel") {
                const Channel = await GetChannel(subscription.guild_id, subscription.channel_id);
                Channel.channel.premium = false;
                await UpdateChannel(subscription.guild_id, subscription.channel_id);
            }
        }
        user.subscriptions = data;
        
        return await Client.db("premium").collection(user_id).updateOne({}, { $set: user });
    }

    return await Client.db("premium").collection(user_id).insertOne({
        subscriptions: data,
        unix: Date.now()
    });
}

export async function Add(msg: Discord.Message, options: string[]) {
    if(options.length > 3) return await msg.reply(`These other arguments don't do anything: ${options.slice(2).join(', ')}`);
    if(options.length == 0) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium add channel|server {guild_id}? {channel_id}?`");

    const User = await GetUser(msg);

    if(options[0] == "server") {
        const id = options[1] || msg.guildId;
        if(options.length > 2) return await msg.reply(`This argument doesn't do anything: ` + options[2]);

        if(!User.subscriptions.some(a => !a.guild_id && a.type == "server")) {
            return await msg.reply("You have used all of your premium server slots! Either remove a server or upgrade your subscription tier");
        }

        if((await Client.db("servers").collection(id).findOne({ premium: { $eq: true } }))) {
            return await msg.reply("This server is already premium");
        }
        User.subscriptions.find(a => a.type == "server" && !a.guild_id).guild_id = id;

        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
        await Client.db("servers").collection(id).updateOne(
            { premium: { $eq: false } },
            { $set: { premium: true }},
            { upsert: true }
        );

        return await msg.reply("Successfully added server to premium");
    }
    
    else if(options[0] == "channel") {
        const guild_id = options[1] || msg.guildId;
        const channel_id = options[2] || msg.channelId;

        if(!User.subscriptions.some(a => !a.channel_id && a.type == "channel")) {
            return await msg.reply("You have used all of your premium channel slots! Either remove a channel or upgrade your subscription tier");
        }

        const Channel = await GetChannel(guild_id, channel_id);
        if(Channel.channel.premium) {
            return await msg.reply("That channel is already premium");
        }
        let data = User.subscriptions.find(a => a.type == "channel" && !a.channel_id);
        data.guild_id = guild_id;
        data.channel_id = channel_id;
        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });

        Channel.channel.premium = true;
        await UpdateChannel(guild_id, channel_id);
        return await msg.reply(`Successfully added <#${channel_id}> to premium`);
    }
    
    else return await msg.reply(`"${options[0]}" is not a valid premium community. Choose from either "channel" or "server"`);
}

export async function Remove(msg: Discord.Message, options: string[]) {
    if(options.length > 3) return await msg.reply(`These other arguments don't do anything: ${options.slice(1).join(', ')}`);
    if(options.length == 0) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium remove channel|server`");

    const User = await GetUser(msg);

    if(options[0] == "server") {
        const id = options[1] || msg.guildId;
        if(options.length > 2) return await msg.reply(`This argument doesn't do anything: ` + options[2]);

        if(!User.subscriptions.find(a => a.type == "server" && a.guild_id == id)) {
            return await msg.reply("You haven't set this server to premium");
        }

        User.subscriptions.find(a => a.type == "server" && a.guild_id == id).guild_id = undefined;

        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
        await Client.db("servers").collection(id).updateOne({ premium: { $eq: true } }, { $set: { premium: false }}, { upsert: true });

        return await msg.reply(`Successfully removed this server from premium`);
    } else {
        if(options.length == 2) return await msg.reply('You need to specify a channel_id! The proper syntax is `i.premium add channel {server_id} {channel_id}`')
        const guild_id = options[1] || msg.guildId;
        const channel_id = options[2] || msg.channelId;

        if(!User.subscriptions.find(a => a.type == "channel" && a.channel_id == channel_id)) {
            return await msg.reply("You haven't set this channel to premium");
        }

        let channel = User.subscriptions.find(a => a.type == "channel" && a.channel_id == channel_id);
        channel.guild_id = undefined;
        channel.channel_id = undefined;
        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });

        const Channel = await GetChannel(guild_id, channel_id);
        Channel.channel.premium = false;
        await UpdateChannel(guild_id, channel_id);

        return await msg.reply(`Successfully removed <#${channel_id}> from premium`);
    }
}

export async function List(msg: Discord.Message) {
    const User = await GetUser(msg);
    let active_servers = User.subscriptions.reduce((a, c) => a + (c.guild_id ? 1 : 0), 0);

    const make_embed = async (index: number) => {
        const embed = new Discord.MessageEmbed({ color: "#d62e00" });
        embed.setTitle("Premium Communities for " + msg.author.username);
        embed.setDescription("View and edit active premium communities linked with your Discord account");

        for(const subscription of User.subscriptions.filter(a => !!a.guild_id)) {
            const emoji = User.subscriptions[index] == subscription ? ':x: ' : ':black_large_square: ';
            const name = (subscription.type == "channel" ? `<#${subscription.channel_id}> in ` : '') + `<Server: ${subscription.guild_id}>`;
            embed.addField('\u2800', `${emoji}\u2800**${name}**`);
        }
        let emoji = index == active_servers ? ':arrow_right: ' : ':black_large_square: ';
        embed.addField('\u2800', emoji + '\u2800**Done**');
        
        return embed;
    }

    let index = 0;
    const response = await msg.channel.send({ embeds: [await make_embed(index)] });
    await response.react("🔺");
    await response.react("🔻");
    await response.react("↔️");
    // Collect reactions
    const Collector = response.createReactionCollector({
        filter: (reaction, user) => !user.bot && ['🔺', '🔻', '↔️'].includes(reaction.emoji.name),
        time: 120000,
        dispose: true,
    });

    // On reaction add
    Collector.on('collect', async (reaction, user) => {
        if(user.id != msg.author.id) return;

        // Move to different commands
        if(['🔺', '🔻'].includes(reaction.emoji.name)) {
            // Modulo to wrap around
            if(reaction.emoji.name == '🔻') index = (index + 1) % (active_servers + 1);
 
            // Make sure index is positive when modulo-ing
            else index = (index + active_servers) % (active_servers + 1);

            // Remove reaction to allow for repeated reactions
            await response.edit({ embeds: [await make_embed(index)] }).catch(() => /* ok? dont care? */{});
            await response.reactions.resolve(reaction.emoji.name).users.remove(user.id).catch(() => /* ok? dont care? */{});
            return;
        }

        if(index == active_servers) {
            await msg.delete();
            return await response.delete();
        }

        let data = User.subscriptions[index];
        let { guild_id, channel_id } = data;
        data.guild_id = undefined;
        data.channel_id = undefined;
        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });

        if(data.type == "channel") {
            const Channel = await GetChannel(guild_id, channel_id);
            Channel.channel.premium = false;
            await UpdateChannel(guild_id, channel_id);
        } else {
            await Client.db("servers").collection(guild_id).updateOne({ premium: { $eq: true } }, { $set: { premium: false }});
        }
        active_servers--;

        // Remove reaction to allow for repeated reactions
        await response.edit({ embeds: [await make_embed(index)] }).catch(() => /* ok? dont care? */{});
        await response.reactions.resolve(reaction.emoji.name).users.remove(user.id).catch(() => /* ok? dont care? */{});
    });

    // At end of 2 minutes delete messages
    Collector.on('end', async () => {
        await response.delete().catch(() => /* ok? dont care? */{});
        await msg.delete().catch(() => /* ok? dont care? */{});
    });
}