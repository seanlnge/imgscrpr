import * as Preference from './store/preference';
import * as Discord from './discord/discord';

export default async function run() {
    await Preference.connect_db();
    Discord.login();
}