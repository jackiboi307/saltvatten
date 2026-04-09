import "/modules/socket.io.js";
import "/modules/nunjucks.js";
import "/modules/js.cookie.js";

var params = new URLSearchParams(document.location.search);
const socket = io(params.get("address"));
var data = {};

nunjucks.configure('templates', { autoescape: true });

function render() {
    function render_id(id, template, context) {
        document.getElementById(id).innerHTML = nunjucks.render(template, context);
    }

    render_id("messages", "messages.html", {
        "messages": data["channels"][params.get("channel")]["messages"],
        "users": data["users"]
    });
    render_id("channels", "channels.html", {
        "channels": Object.keys(data["channels"])
    });

    fix_images();

    const messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;
}

function fix_images() {
    const a_tags = document.getElementById("messages").getElementsByTagName("a");
    for (const a of a_tags) {
        var image = new Image();
        image.onload = function() {
            if (this.width > 0) {
                a.outerHTML = nunjucks.render("image.html", { "url": a.href });
            }
        }
        image.src = a.href;
    }
}

window.send = () => {
    try {
        let form = document.getElementById("prompt").getElementsByTagName("form")[0];
        let content = form.getElementsByTagName("input")[0].value;
        socket.emit("message", { "content": content, "channel": params.get("channel") });
        form.reset();
    } catch (e) {
        console.log("error when sending message:", e);
    } finally {
        return false;
    }
};

window.set_channel = (channel) => {
    params.set("channel", channel);
    window.history.pushState(null, "", "?" + params.toString());
    render();
}

socket.on("data", (new_data) => {
    data = new_data;
    render();
});

socket.on("patch", (patch) => {
    console.log("patch");
    data = jsonpatch.apply_patch(data, patch);
    render();
});

socket.on("authorized", (_) => {
    socket.emit("get-data", {});
});

var token = Cookies.get("token");
socket.emit("token-login", token);

