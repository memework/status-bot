function ping(data) {
    data.say("Pong!");
}

let formatting_regex = /\*|_|~|`/gi;

function help(data, added) {
    let thehelp = added.generatehelp(data.args.join(" "));
    if (data.origin == "twitch") {
        let helparr = thehelp.replace(formatting_regex, "").split("\n");
        let i = -1;
        let helpinterval = setInterval(() => {
            if (i++ + 1 >= helparr.length) clearInterval(helpinterval);
            data.PMSay(helparr[i]);
        }, 2 * 1000);
    }
    data.say(thehelp);
}


module.exports = {
    commands: [
        {
            trigger: ["ping"],
            call: ping,
            description: "Replies with pong",
            category: "basic"
        },
        {
            trigger: ["help"],
            description: "Gives this page!",
            additional: ["generatehelp"],
            call: help,
            category: "basic"
        }
    ]
}