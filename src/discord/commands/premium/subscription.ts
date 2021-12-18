import { Client, GetChannel, UpdateChannel } from "../../../database/preference";
import * as Discord from "discord.js";
import { GetUser } from "./static";

export async function UpdateUser(user_id: string, data: { [key: string]: string }[]) {
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
    if(options.length > 3) return await msg.reply(`These other arguments don't do anything: ${options.slice(1).join(', ')}`);
    if(options.length == 0) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium add channel|server`");

    const User = await GetUser(msg);

    if(options[0] == "server") {
        const id = options[1] || msg.guildId;
        if(options.length > 2) return await msg.reply(`This argument doesn't do anything: ` + options[2]);

        if(!User.subscriptions.some(a => !a.guild_id && a.type == "server")) {
            return await msg.reply("You have used all of your premium server slots! Either remove a server or upgrade your subscription tier");
        }

        if((await Client.db("servers").collection(msg.guildId).findOne({ premium: { $eq: true } }))) {
            return await msg.reply("This server is already premium");
        }
        User.subscriptions.find(a => a.type == "server" && !a.guild_id).guild_id = id;

        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
        await Client.db("servers").collection(msg.guildId).updateOne(
            { premium: { $eq: false } },
            { $set: { premium: true }},
            { upsert: true }
        );

        return await msg.reply("Successfully added server to premium");
    } else {
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
}

export async function Remove(msg: Discord.Message, options: string[]) {
    if(options.length > 1) return await msg.reply(`These other arguments don't do anything: ${options.slice(1).join(', ')}`);
    if(options.length == 0) return await msg.reply("You forgot to add a channel ID! The correct syntax is `i.premium remove channel|server`");

    const User = await GetUser(msg);

    if(options[0] == "server") {
        if(!User.subscriptions.find(a => a.type == "server" && a.guild_id == msg.guildId)) {
            return await msg.reply("You haven't set this server to premium");
        }

        User.subscriptions.find(a => a.type == "server" && a.guild_id == msg.guildId).guild_id = undefined;

        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });
        await Client.db("servers").collection(msg.guildId).updateOne({ premium: { $eq: true } }, { $set: { premium: false }});

        return await msg.reply(`Successfully removed this server from premium`);
    } else {
        if(!User.subscriptions.find(a => a.type == "channel" && a.channel_id == msg.channelId)) {
            return await msg.reply("You haven't set this channel to premium");
        }

        let data = User.subscriptions.find(a => a.type == "channel" && a.channel_id == msg.channelId)
        data.guild_id = undefined;
        data.channel_id = undefined;
        await Client.db("premium").collection(msg.author.id).updateOne({}, { $set: User });

        const Channel = await GetChannel(msg.guildId, msg.channelId);
        Channel.channel.premium = false;
        await UpdateChannel(msg.guildId, msg.channelId);

        return await msg.reply(`Successfully removed <#${msg.channelId}> from premium`);
    }
}