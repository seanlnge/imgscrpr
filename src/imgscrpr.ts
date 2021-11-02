import * as Preference from './preference/preference';
import * as Discord from './discord/discord';

export default async function run() {
    await Preference.connect_db();
    Discord.login();
}