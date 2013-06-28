var steam = require("steam"),
    http = require("http"),
    util = require("util"),
    fs = require("fs"),
    vdf = require("vdf"),
    deferred = require("deferred");
    Schema = require('protobuf').Schema;
    bot = new steam.SteamClient(),
    pls_sort = require("./sort").sort,
    fs = require("fs"),
    dotoSchema = new Schema(fs.readFileSync(__dirname + "/doto_base_gcmessages.desc")),
    halloSchema = new Schema(fs.readFileSync(__dirname + "/doto_gcsdk_gcmessages.desc")),
    protoMask = 0x80000000;

global.config = require("./config");

/* Steam logic */
var onSteamLogOn = function onSteamLogOn(){
        bot.setPersonaState(steam.EPersonaState.Busy); // to display your bot's status as "Online"
        bot.setPersonaName(config.steam_name); // to change its nickname
        util.log("Logged on.");

        util.log("Playing doto");
        playDota();
        setTimeout(function(){
            bot.toGC(570, (4006 | protoMask), halloSchema.CMsgClientHello.serialize({}));
        }, 5000);

        setTimeout(function(){
            pls_sort(bot.steamID, config.api_key, moveItems);
        }, 10000);
    },
    onSteamSentry = function onSteamSentry(sentry) {
        util.log("Received sentry.");
        require('fs').writeFileSync('sentry', sentry);
    },
    onSteamServers = function onSteamServers(servers) {
        util.log("Received servers.");
        fs.writeFile('servers', JSON.stringify(servers));
    },
    onWebSessionID = function onWebSessionID(webSessionID) {
        util.log("Received web session id.");
        // steamTrade.sessionID = webSessionID;
        bot.webLogOn(function onWebLogonSetTradeCookies(strCookies) {
            util.log("Received cookies.");
            cookies = strCookies.split(";");
            for (var i = 0; i < cookies.length; i++) {
                // steamTrade.setCookie(cookies[i]);
            }
        });
    },
    fromGC = function fromGC(app, type, message) {
        util.log("From GC: " + [app, type - protoMask]);
    };

bot.logOn(config.steam_user, config.steam_pass, config.steam_guard_code || fs.readFileSync('sentry'));
bot.on("loggedOn", onSteamLogOn)
    .on('sentry', onSteamSentry)
    .on('servers', onSteamServers)
    .on('webSessionID', onWebSessionID)
    .on("fromGC", fromGC);

playDota = function() {
    bot.gamesPlayed([570]);
};

moveItems = function(itemPosMap) {
    if (itemPosMap.length === 0) return "Go away fat head.";
    var itemPositions = [];

    for (var i = 0; i < itemPosMap.length; i++) {
        itemPositions.push({
            itemId: itemPosMap[i][0],
            position: itemPosMap[i][1]
        });
    }

    var payload = dotoSchema.CMsgSetItemPositions.serialize({
        itemPositions: itemPositions
    });
    setTimeout(function(){
        bot.toGC(570, (1077 | protoMask), payload);
    }, 5000);
};