import "/modules/socket.io.js";
import "/modules/nunjucks.js";
import "/modules/js.cookie.js";

var params = new URLSearchParams(document.location.search);
var data = {};
var socket;

nunjucks.configure('templates', { autoescape: true });

function getChannel() {
    const channel = params.get("channel");
    if (channel === null) {
        setChannel(Object.keys(data["channels"])[0]);
        return params.get("channel");
    } else {
        return channel;
    }
}

function render() {
    function renderId(id, template, context) {
        document.getElementById(id).innerHTML = nunjucks.render(template, context);
    }

    renderId("messages", "messages.html", {
        "messages": data["channels"][getChannel()]["messages"],
        "users": data["users"]
    });
    renderId("channels", "channels.html", {
        "channels": Object.keys(data["channels"])
    });
}

function scrollToBottom() {
    var messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;
}

function checkMaxScroll() {
    var messages = document.getElementById("messages");
    return messages.scrollHeight - messages.clientHeight - messages.scrollTop < 100;
}

window.send = () => {
    try {
        let form = document.getElementById("prompt").getElementsByTagName("form")[0];
        let content = form.getElementsByTagName("input")[0].value;
        if (content.trim().length !== 0) {
            socket.emit("message", { "content": content, "channel": getChannel() });
        } else {
            scrollToBottom();
        }
        form.reset();
    } catch (e) {
        console.log("error when sending message:", e);
    } finally {
        return false;
    }
};

function setChannel(channel) {
    params.set("channel", channel);
    window.history.pushState(null, "", "?" + params.toString());
    render();
    scrollToBottom();
}

window.setChannel = setChannel;

var address = params.get("address");

if (address === null) {
    document.getElementsByTagName("html")[0].innerHTML = nunjucks.render("index.html");

} else {
    var token = Cookies.get("token");
    if (token === undefined) {
        document.location = "https://kattmys.se/login?redirect=" + document.location;
    }

    socket = io(address);

    var first = true;
    socket.on("data", (new_data) => {
        data = new_data;
        render();
        if (first) {
            first = false;
            scrollToBottom();
        }
    });

    socket.on("patch", (patchData) => {
        console.log("patch");
        data = jsonpatch.apply_patch(data, patchData["patch"]);
        render();
        if (patchData["response"] || checkMaxScroll()) {
            scrollToBottom();
        }
    });

    socket.on("authorized", (_) => {
        socket.emit("get-data", {});
    });

    socket.emit("token-login", token);
}
