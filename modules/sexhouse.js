// This is where all the fun happens.

var child = require("child");
var vmname = "sexhouse";

function runFile(data, command, callback) {
    let tmplog = "";
    exec("lxc-attach -n " + vmname + " -- bash -c '" + command + "'", function (output) { tmplog += output }, function (error, stderr) {
        callback(null, tmplog + stderr);
    });
}

function exec(command, onData, onClose) {

    onData = onData || function () { }
    onClose = onClose || function () { }
    var runCommand = [];
    command.replace(/"([^"]*)"|'([^']*)'|(\S+)/g, function (g0, g1, g2, g3) { runCommand.push(g1 || g2 || g3 || '') });

    var errors = '';

    child({
        command: runCommand.slice(0, 1)[0],
        args: runCommand.slice(1),
        cbStdout: function (data) { onData('' + data) },
        cbStderr: function (data) { errors += data; onData('' + data) },
        cbClose: function (exitCode) { onClose(exitCode, errors) }
    }).start()
}

function topcpu(data) {
    runFile(data, "ps aux --sort=-pcpu | head -n5", function(err, log) {
        if(err) return false;
        data.say("Processes using the most CPU: ```" + log + "```");
    });
}

function getNetworkConn(data) {
    runFile(data, "w", function(err, log) {
        if(err) return false;
        data.say("Network connections: ```" + log + "```");
    });
}

function topmem(data) {
    runFile(data, "ps aux --sort=-pmem | head -n5", function(err, log) {
        if(err) return false;
        data.say("Processes using the most RAM: ```" + log + "```");
    });
}

function uptime(data) {
    runFile(data, "uptime", function(err, log) {
        if(err) return false;
        data.say("System uptime: ```" + log + "```");
    });
}

function diskfree(data) {
    runFile(data, "df -h /", function(err, log) {
        if(err) return false;
        data.say("Disk usage: ```" + log + "```");
    });
}

function memfree(data) {
    runFile(data, "free -h", function(err, log) {
        if(err) return false;
        data.say("Memory free: ```" + log + "```");
    });
}



module.exports = {
    commands: [
        {
            trigger: ["topcpu"],
            description: "Gets the top 5 processes using the most CPU",
            call: topcpu,
            category: "sexhouse"
        },
        {
            trigger: ["topmem"],
            description: "Gets the top 5 processes using the most RAM",
            call: topmem,
            category: "sexhouse"
        },
        {
            trigger: ["w"],
            description: "Gets the network connections for SSH mostly",
            call: getNetworkConn,
            category: "sexhouse"
        },
        {
            trigger: ["uptime"],
            description: "Gets the system uptime",
            call: uptime,
            category: "sexhouse"
        },
        {
            trigger: ["disk"],
            description: "Gets the free space on the drive",
            call: diskfree,
            category: "sexhouse"
        },
        {
            trigger: ["mem"],
            description: "Gets the RAM usage",
            call: memfree,
            category: "sexhouse"
        }
    ]
}
