"use strict";
exports.__esModule = true;
exports.sr_score = exports.sr_connections = void 0;
var fs_1 = require("fs");
var preference_1 = require("../../preference/preference");
var subreddits = JSON.parse((0, fs_1.readFileSync)(__dirname + '/subreddits.json', 'utf-8'));
function sr_connections(subreddit) {
    var data = subreddits[subreddit] || {};
    delete data.count;
    return data;
}
exports.sr_connections = sr_connections;
function sr_score(subreddit, preference) {
    function ud_ratio(subreddit) {
        var sub_data = (0, preference_1.get_subreddit)(subreddit, preference);
        if (!sub_data)
            return 0;
        var upvotes = sub_data.upvotes;
        var downvotes = sub_data.downvotes;
        return (upvotes - downvotes) / (upvotes + downvotes + 8);
    }
    var connections = sr_connections(subreddit);
    var connection_score = Object.keys(connections).reduce(function (acc, cur) { return acc
        + connections[cur] / 100
            * ud_ratio(cur); }, 0);
    return ud_ratio(subreddit) + connection_score;
}
exports.sr_score = sr_score;
