var http = require("http"),
    util = require("util"),
    vdf = require("vdf"),
    deferred = require("deferred"),
    fs = require("fs"),
    dotoSchema = new Schema(fs.readFileSync(__dirname + "/doto_base_gcmessages.desc")),
    halloSchema = new Schema(fs.readFileSync(__dirname + "/doto_gcsdk_gcmessages.desc")),
    protoMask = 0x80000000;

exports.sort = function do_sort(account, api_key, callback) {
    var API_KEY = api_key,
        ACCOUNT_ID = account,
        // ACCOUNT_ID = "76561197989222171", // RJ
        // ACCOUNT_ID = "76561198035293989", // twgthree
        GET_SCHEMA_URL_URL =  util.format("http://api.steampowered.com/IEconItems_570/GetSchemaURL/v1/?key=%s", API_KEY),
        GET_PLAYER_ITEMS_URL =  util.format("http://api.steampowered.com/IEconItems_570/GetPlayerItems/v1/?key=%s&steamid=%s", API_KEY, ACCOUNT_ID),
        GET_HEROES_URL =  util.format("http://api.steampowered.com/IEconDOTA2_570/GetHeroes/v1/?key=%s&language=en_us&format=vdf", API_KEY);

    var d_player_items = deferred(),
        d_schema = deferred(),
        d_heroes = deferred();

    http.get(GET_SCHEMA_URL_URL, function(response) {
        var buf = "";
        response.on("data", function (data) {
            buf += data;
        });
        response.on("end", function (data) {
            http.get(JSON.parse(buf).result.items_game_url, function (response2) {
                var buf2 = "";
                response2.on("data", function (data2) {
                   buf2 += data2;
                });
                response2.on("end", function () {
                    d_schema.resolve(vdf.parse(buf2).items_game.items);
                });
            });
        });
    });

    http.get(GET_PLAYER_ITEMS_URL, function(response) {
        var buf = "";
        response.on("data", function (data) {
            buf += data;
        });
        response.on("end", function(){
            d_player_items.resolve(JSON.parse(buf).result.items);
        });
    });

    http.get(GET_HEROES_URL, function(response) {
        var buf = "";
        response.on("data", function (data) {
            buf += data;
        });
        response.on("end", function () {
            d_heroes.resolve(vdf.parse(buf).result.heroes);
        });
    });

    deferred(d_player_items.promise(), d_schema.promise(), d_heroes.promise()).then(sort);


    function sort(result) {
        var player_items = result[0],
            schema = result[1],
            heroes = result[2],

            hero_items = {},
            hero_array = [],
            non_hero_items = [],
            crates = [],
            duplicates = [],
            i;

        /* Set up hero_items object. */
        for (i in heroes) {
            hero_items[heroes[i].name] = [];
            hero_array[i] = heroes[i].name; // push method too slow, causing problems.
        }
        hero_array.sort();
        hero_array.reverse();

        /* Map items to their hero, or put them in non_hero_items if they don't have an associated hero.*/
        for (i = 0; i < player_items.length; i++) {
            var item = player_items[i];
            item.schema = schema[item.defindex];

            /* Don't map items to a hero if that item can be used by multiple heroes; treat it as a non-hero item. */
            // debugger;
            if (item.schema.used_by_heroes && Object.keys(item.schema.used_by_heroes).length === 1 && !item.schema.tool) {
                var hero_item_array = hero_items[Object.keys(item.schema.used_by_heroes)[0]];
                if (hero_item_array.map(function(obj){ return obj.defindex; }).indexOf(item.defindex) !== -1) {
                    duplicates.push(item);
                }
                else {
                    hero_item_array.push(item);
                }
            }
            else if (item.schema.tool && item.schema.tool.type === "supply_crate") {
                crates.push(item);
            }
            else {
                non_hero_items.push(item);
            }
        }

        // Set timeout because hero_array isn't populated by the time we try pop it, cuz its slow as shit for some reason.
        setTimeout(function fuckingSlowArray(){
            var COLUMNS = 8,
                ROWS = 8,
                PAGES = 16,
                backpack = Array(COLUMNS * ROWS * PAGES),
                current_hero = hero_array.pop(),
                done_heroes = false;

            // Setup backpack
            for (var i = 0; i < backpack.length; i++) {
                backpack[i] = "";
            }

            for (var p = 0; p < PAGES; p++) {
                for (var r = 0; r < ROWS; r++) {
                    for (var c = 0; c < COLUMNS; c++) {
                        item = undefined;
                        if (p === 0) {
                            // Skip cos already nicely formatted.
                            // item = non_hero_items.pop();
                        }
                        else if (current_hero) {
                            if (hero_items[current_hero] && hero_items[current_hero].length === 0) {
                                current_hero = hero_array.pop();
                            }
                            else {
                                item = hero_items[current_hero] !== undefined ? hero_items[current_hero].pop() : undefined;
                            }
                        }
                        else {
                            if (done_heroes) {
                                item = crates.pop() || duplicates.pop();
                            }
                            else if (r === 0 || c === 0) {
                                // Attempt to put dupes on their own row/col.
                                done_heroes = true;
                            }
                        }
                        if (item === undefined) break;
                        // var position = ((p * ROWS * COLUMNS) + (r * ROWS)) + c; // Row major
                        var position = ((p * ROWS * COLUMNS) + (c * COLUMNS)) + r; // Col major
                        backpack[position] = [item.id, position+1];
                    }
                }
            }

            console.log("Moving itemsz");
            callback(backpack);
        }, 5000);
    }
};