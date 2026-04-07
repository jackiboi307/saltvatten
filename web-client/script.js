import "/modules/socket.io.js";
import "/modules/nunjucks.js";
import "/modules/js.cookie.js";

var params = new URLSearchParams(document.location.search);
const socket = io(params.get("address"));
var data = {};

function render() {
    document.getElementById("messages").innerHTML = nunjucks.renderString(
        `{% for message in messages %}
        <p class="message">
            <span class="username">{{ users[message.user_id].username }}</span>
            <span class="separator">&gt;</span>
            <span class="content">{{ message.content }}</span>
        </p>
        {% endfor %}`,
        {
            "messages": data["channels"][params.get("channel")]["messages"],
            "users": data["users"]
        }
    );
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

