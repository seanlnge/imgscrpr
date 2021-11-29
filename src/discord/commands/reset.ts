import * as Discord from 'discord.js';
import { ResetChannel } from '../../database/preference';

/**
 * Reset channel and channel preferences
 * @param msg Discord message object
 */
export async function Reset(msg: Discord.Message) {
    await ResetChannel(msg.channelId);
    await msg.channel.send("Channel reset");
}