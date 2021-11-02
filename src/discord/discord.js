"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.login = void 0;
var Discord = require("discord.js");
var scraper_1 = require("../feed/scraper/scraper");
var Preference = require("../preference/preference");
require('dotenv').config();
var client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
client.on("ready", function () {
    console.log("Logged in as " + client.user.tag + "!");
});
client.on("messageCreate", function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var server, post_1, message, subreddit_1, collector;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (msg.author.bot)
                    return [2 /*return*/];
                if (!(msg.content == "/image")) return [3 /*break*/, 9];
                return [4 /*yield*/, Preference.get_server_pref(msg.channel.id)];
            case 1:
                server = _a.sent();
                return [4 /*yield*/, (0, scraper_1.scrape)(server)];
            case 2:
                post_1 = _a.sent();
                return [4 /*yield*/, msg.channel.send({ files: [post_1.post.url] })["catch"](function (err) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, msg.channel.send(post_1.post.url)];
                            case 1: return [2 /*return*/, _a.sent()];
                        }
                    }); }); })];
            case 3:
                message = _a.sent();
                return [4 /*yield*/, message.react('🟢')];
            case 4:
                _a.sent();
                return [4 /*yield*/, message.react('🔴')];
            case 5:
                _a.sent();
                subreddit_1 = Preference.get_subreddit(post_1.post.subreddit, server);
                if (!!subreddit_1) return [3 /*break*/, 7];
                subreddit_1 = { subreddit: post_1.post.subreddit, upvotes: 0, downvotes: 0, previous_post: post_1.post.id };
                return [4 /*yield*/, Preference.insert(msg.channel.id, subreddit_1)];
            case 6:
                _a.sent();
                _a.label = 7;
            case 7:
                subreddit_1.previous_post = post_1.post.id;
                return [4 /*yield*/, Preference.update(msg.channel.id, subreddit_1.subreddit, subreddit_1)];
            case 8:
                _a.sent();
                collector = message.createReactionCollector({
                    filter: function (reaction, user) { return !user.bot && ['🟢', '🔴'].includes(reaction.emoji.name); },
                    time: 3600000,
                    dispose: true
                });
                collector.on('collect', function (reaction) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (reaction.emoji.name == '🟢')
                                    subreddit_1.upvotes++;
                                if (reaction.emoji.name == '🔴')
                                    subreddit_1.downvotes++;
                                return [4 /*yield*/, Preference.update(msg.channel.id, subreddit_1.subreddit, subreddit_1)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                collector.on('remove', function (reaction) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (reaction.emoji.name == '🟢')
                                    subreddit_1.upvotes--;
                                if (reaction.emoji.name == '🔴')
                                    subreddit_1.downvotes--;
                                return [4 /*yield*/, Preference.update(msg.channel.id, subreddit_1.subreddit, subreddit_1)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                _a.label = 9;
            case 9:
                if (!(msg.content == "reset")) return [3 /*break*/, 11];
                return [4 /*yield*/, Preference.reset(msg.channel.id)];
            case 10:
                _a.sent();
                _a.label = 11;
            case 11: return [2 /*return*/];
        }
    });
}); });
function login() {
    client.login(process.env.TOKEN);
}
exports.login = login;
