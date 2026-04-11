import "/modules/socket.io.js";
import "/modules/nunjucks.js";
import "/modules/js.cookie.js";

var params = new URLSearchParams(document.location.search);
const socket = io(params.get("address"));
var data = {};

nunjucks.configure('templates', { autoescape: true });

function render() {
    function renderId(id, template, context) {
        document.getElementById(id).innerHTML = nunjucks.render(template, context);
    }

    renderId("messages", "messages.html", {
        "messages": data["channels"][params.get("channel")]["messages"],
        "users": data["users"]
    });
    renderId("channels", "channels.html", {
        "channels": Object.keys(data["channels"])
    });
}

function scrollToBottom() {
    var messages = document.getElementsByClassName("message");
    messages[messages.length - 1].scrollIntoView(false);
}

function checkMaxScroll() {
    var messages = document.getElementsByClassName("message");
    return messages.scrollTop == messages.scrollTopMax;
}

window.send = () => {
    try {
        let form = document.getElementById("prompt").getElementsByTagName("form")[0];
        let content = form.getElementsByTagName("input")[0].value;
        if (content.trim().length !== 0) {
            socket.emit("message", { "content": content, "channel": params.get("channel") });
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

window.setChannel = (channel) => {
    params.set("channel", channel);
    window.history.pushState(null, "", "?" + params.toString());
    render();
    scrollToBottom();
}

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

var token = Cookies.get("token");
socket.emit("token-login", token);

