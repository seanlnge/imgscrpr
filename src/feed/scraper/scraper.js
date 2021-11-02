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
exports.scrape = void 0;
var reddit_1 = require("./reddit");
var preference_1 = require("../../preference/preference");
var subreddits_1 = require("../processer/subreddits");
function scrape(preference) {
    return __awaiter(this, void 0, void 0, function () {
        var subreddits, _i, preference_2, sub_1, ranked_subs, amount, random, sub, post, sub_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    subreddits = new Set();
                    for (_i = 0, preference_2 = preference; _i < preference_2.length; _i++) {
                        sub_1 = preference_2[_i];
                        subreddits.add(sub_1.subreddit);
                        Object.keys((0, subreddits_1.sr_connections)(sub_1.subreddit)).forEach(function (a) { return subreddits.add(a); });
                    }
                    ranked_subs = Array.from(subreddits).map(function (sub) { return ({
                        subreddit: sub,
                        score: Math.cbrt((0, subreddits_1.sr_score)(sub, preference)) + Math.random() / 10,
                        last: ((0, preference_1.get_subreddit)(sub, preference) || { previous_post: undefined }).previous_post
                    }); }).sort(function (a, b) { return b.score - a.score; });
                    amount = 5;
                    random = Math.floor(Math.pow(Math.random(), 2) * amount);
                    console.log(ranked_subs.slice(0, amount));
                    sub = ranked_subs[random];
                    return [4 /*yield*/, (0, reddit_1.get_post)(sub.subreddit, { after: sub.last })];
                case 1:
                    post = _a.sent();
                    _a.label = 2;
                case 2:
                    if (!!post) return [3 /*break*/, 4];
                    sub_2 = ranked_subs[random];
                    random = (random + 1) % amount;
                    return [4 /*yield*/, (0, reddit_1.get_post)(sub_2.subreddit, { after: sub_2.last })];
                case 3:
                    post = _a.sent();
                    return [3 /*break*/, 2];
                case 4: return [2 /*return*/, { post: post, score: ranked_subs[random].score }];
            }
        });
    });
}
exports.scrape = scrape;
