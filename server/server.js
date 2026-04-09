import { Server } from "socket.io";
import * as fs from 'node:fs';
import { createServer } from "http";

const auth_unrequired = ["token-login"];
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

function write() {
    fs.writeFileSync("data.json", JSON.stringify(data, null, 4));
}

async function main() {
    var connected_users = {};

    const httpserver = createServer();
    const io = new Server(httpserver, {
        cors: {
            origin: "*"
        }
    });

    async function add_event(socket, event_name, func) {
        socket.on(event_name, async (data) => {
            console.log("[" + event_name + "] [" + socket.id + "]");
            if (auth_unrequired.includes(event_name) || socket.id in connected_users) {
                try {
                    await func(data);
                } catch (e) {
                    console.log("[" + event_name + "] ["
                        + socket.id + "] " + "error: " + e);
                }
            } else {
                console.log("[" + event_name + "] ["
                    + socket.id + "] " + "error: unauthorized");
            }
        });
    }

    io.on("connection", async (socket) => {
        console.log("connected: " + socket.id);

        await add_event(socket, "token-login", async (token) => {
            const response = await fetch(config["auth-server"] + "/token-login", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(token)
            });

            const text = await response.text();
            let user_data;
            try {
                user_data = JSON.parse(text);
            } catch (e) {
                console.log("error when parsing response as json: " + e + "\n" + text);
                return;
            }

            const user_id = user_data["user_id"]
            connected_users[socket.id] = user_id;
            if (!(user_id in data["users"])) {
                data["users"][user_id] = {};
            }
            data["users"][user_id]["username"] = user_data["username"];
            socket.emit("authorized", {});
        });

        await add_event(socket, "get-data", async (_) => {
            socket.emit("data", data);
        });

        await add_event(socket, "message", async (message) => {
            const channel = message["channel"];
            const content = message["content"];
            var message = {
                "content": content,
                "user_id": connected_users[socket.id],
                "timestamp": 0
            };
            data["channels"][channel]["messages"].push(message);
            io.emit("patch", [{
                "op": "add", "path": "/channels/" + channel + "/messages/-", "value": message
            }]);
            write();
        });
    });

    httpserver.listen(config["port"]);
    console.log("server started");
}

main();
