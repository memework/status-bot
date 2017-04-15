try {
    var tokens = require("./secrets.json");
} catch (e) {
    console.log(e);
    throw new Error("You need to enter your token in ./secrets.json! (See an example in secrets_example.json)");
}

try {
    var Discord = require("discord.js");
    var fs = require("fs");
    var path = require("path");
} catch (e) {
    throw new Error("You need to run `npm i` first!");
}

var bot = new Discord.Client();
bot.login(tokens.discord);

let modules = {};
scanmodules();

bot.on("disconnect", function (err) {
    console.warn("Jake attempted to kick me off Discord with error code: " + err.code + " (" + err.reason + ")! When I disconnected, the socket was" + (err.wasClean ? "" : " not") + " cleanly closed! Attempting reconnection :D");
});

let prefixes = [];

bot.on("ready", function () {
    console.log("Successfully connected: " + bot.user.username + " - (" + bot.user.id + ")");
    prefixes = ["<@" + bot.id + ">", "plsgimmeknowledgebytellingme-", "ssh!"];
});

let timers = {};

bot.on("message", function (msg) {
    let args = msg.content.split(" ");

    let iscommand = false,
        thecommand = args.shift(),
        t;
    for (let prefix in prefixes) {
        iscommand = prefixes[prefix] == thecommand.substring(0, prefixes[prefix].length);
        t = thecommand.substring(prefixes[prefix].length, thecommand.length);
        if (iscommand) break;
    }
    if (!iscommand) return;

    let cmddata = {
        msg,
        args,
        trigger: t,
        origin: "discord",
        say: (message) => {
            return msg.channel.send(message);
        }
    };

    findcommand(cmddata, true);
});



function scanmodules() {
    fs.readdir("modules", function (err, files) {
        if (err) {
            console.warn(err);
            return false;
        }
        for (let f in files) {
            if (!Object.keys(require.extensions).includes(path.extname(files[f]))) {
                console.log("Skipping " + files[f] + " because the extension name doesn't match the following: " + Object.keys(require.extensions).join(", ") + "!");
                continue;
            }
            console.log("Adding " + files[f] + "!");
            let currentmodule = require("./modules/" + files[f].replace(".js", ""));
            if (currentmodule.sendvars) {
                currentmodule.sendvars({
                    bot
                });
            }
            modules[path.basename(files[f])] = currentmodule;
        }
    });
}

function findcommand(cmddata) {
    for (let itm in modules) {
        for (let cmd in modules[itm].commands) {
            let command = modules[itm].commands[cmd];
            let trigger = command.trigger;
            if (typeof trigger == "string") {
                trigger = [trigger];
            }
            for (let trig in trigger) {
                if (trigger[trig] == cmddata.trigger) {
                    callcommand(command, cmddata, function (err) {
                        if (err) {
                            console.log("Command " + cmddata.trigger + " failed with: " + err + "!");
                            return;
                        }
                        console.log("Executed command: " + cmddata.trigger + "!");
                    }, modules[itm]);
                    break;
                }
            }
        }
    }
}

function generatehelp(category) {
    if (!category) {
        category = "all";
    }

    let helptextheader = (category == "all" ? "Showing all help categories:" : "Help for category **" + category + "**:");
    let helptext = "";

    if (category == "all") {
        let helps = {};
        for (let mod in modules) {
            for (let cmd in modules[mod].commands) {
                let command = modules[mod].commands[cmd];
                if (!helps[command.category]) helps[command.category] = "";
                if (typeof command.trigger == "string") command.trigger = [command.trigger];
                helps[command.category] += "\n`" + command.trigger.join("` or `") + "` - " + (command.description ? command.description : "no description");
            }
        }
        for (let cat in helps) {
            helptext += "\n\n**" + cat + "**" + helps[cat];
        }
    }

    for (let mod in modules) {
        for (let cmd in modules[mod].commands) {
            let command = modules[mod].commands[cmd];
            if (typeof command.trigger == "string") command.trigger = [command.trigger];
            if (command.category == category) helptext += "\n`" + command.trigger.join("` or `") + "` - " + (command.description ? command.description : "no description");
        }
    }
    if (helptext == "") {
        return "The category **" + category + "** was not found!";
    }
    return helptextheader + helptext;
}

function callcommand(command, cmddata, callback, cmdmodule) {
    try {
        if (command.channels && !command.channels.includes(cmddata.msg.channel.id)) {
            cmddata.say("Sorry! That command isn't allowed in this channel! Try one of the following: <#" + command.channels.join(">, <#") + ">");
            if (callback) {
                callback("DisallowedInChannel");
            }
            return false;
        }
        if (command.permissions) {
            if (!cmddata.msg.member.hasPermissions(command.permissions)) {
                cmddata.say("Sorry! You don't have the permissions needed to run this command! You need the following permissions: `" + command.permissions.join("`, `") + "`. The permissions you're missing are: `" + cmddata.msg.member.missingPermissions(command.permissions).join("`, `") + "`");
                if (callback) {
                    callback("MissingPermissions");
                }
                return false;
            }
        }

        let additional = {};
        if (command.additional) {
            let extradata = {
                bot,
                timers,
                findcommand,
                callcommand,
                modules,
                generatehelp,
                process
            };
            for (let adder in command.additional) {
                additional[command.additional[adder]] = extradata[command.additional[adder]];
            }
        }

        cmddata.err = function (err) {
            if (!err) return;
            if (callback) callback(err);
            cmddata.say("Error running command `" + cmddata.trigger + "`: ```" + err + "```");
        };

        if (cmdmodule.preexec) {
            cmdmodule.preexec(cmddata, function (allowed) {
                if (!allowed) {
                    if (callback) {
                        callback("PreExecFalse");
                    }
                    return false;
                }
                command.call(cmddata, additional);
            });
        } else {
            command.call(cmddata, additional);
        }
    } catch (e) {
        cmddata.err(e);
        return false;
    }
    if (callback) {
        callback(false);
    }
}
