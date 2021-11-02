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
exports.update = exports.insert = exports.reset = exports.get_server_pref = exports.connect_db = exports.get_subreddit = void 0;
var mongodb_1 = require("mongodb");
require('dotenv').config();
var uri = "mongodb+srv://seanLange:" + process.env.MONGO_PASS + "@cluster0.ux4by.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
var client = new mongodb_1.MongoClient(uri, {});
function PREF_INIT() {
    return [
        { subreddit: "gonewild", upvotes: 0, downvotes: 0, previous_post: undefined },
        //{ subreddit: "ihaveihaveihavereddit", upvotes: 0, downvotes: 0, previous_post: undefined },
        //{ subreddit: "comedynecrophilia", upvotes: 0, downvotes: 0, previous_post: undefined },
        //{ subreddit: "hentai", upvotes: 0, downvotes: 0, previous_post: undefined }
    ];
}
function get_subreddit(subreddit, preference) {
    return preference.find(function (a) { return a.subreddit == subreddit; });
}
exports.get_subreddit = get_subreddit;
function connect_db() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client.connect()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.connect_db = connect_db;
function get_server_pref(server_id) {
    return __awaiter(this, void 0, void 0, function () {
        var pref;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client.db("preferences").collection(server_id).find().toArray()];
                case 1:
                    pref = _a.sent();
                    if (!(pref.length == 0)) return [3 /*break*/, 3];
                    pref = PREF_INIT();
                    return [4 /*yield*/, client.db("preferences").collection(server_id).insertMany(pref)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/, pref];
            }
        });
    });
}
exports.get_server_pref = get_server_pref;
function reset(server_id) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client.db("preferences").collection(server_id).deleteMany({})];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, client.db("preferences").collection(server_id).insertMany(PREF_INIT())];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.reset = reset;
function insert(server_id, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client.db("preferences").collection(server_id).insertOne(data)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.insert = insert;
function update(server_id, subreddit, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client.db("preferences").collection(server_id).updateOne({ subreddit: subreddit }, { $set: data })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.update = update;
