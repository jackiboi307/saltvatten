import { Server } from "socket.io";
import * as fs from 'node:fs';
import { createServer } from "http";

const authUnrequired = ["token-login"];
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

function write() {
    fs.writeFileSync("data.json", JSON.stringify(data, null, 4));
}

function error(msg) {
    console.error("error: " + msg);
    return;
}

async function main() {
    var connectedUsers = {};

    const httpserver = createServer();
    const io = new Server(httpserver, {
        cors: {
            origin: "*"
        }
    });

    async function addEvent(socket, event_name, func) {
        socket.on(event_name, async (data) => {
            console.log("[" + event_name + "] [" + socket.id + "]");
            if (authUnrequired.includes(event_name) || socket.id in connectedUsers) {
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

    async function doPatch(socket, patch) {
        io.except(socket.id).emit("patch", {"response": false, "patch": patch});
        socket.emit("patch", {"response": true, "patch": patch});
    }

    io.on("connection", async (socket) => {
        console.log("connected: " + socket.id);

        await addEvent(socket, "token-login", async (token) => {
            const response = await fetch(config["auth-server"] + "/token-login", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(token)
            });

            const text = await response.text();
            let userData;
            try {
                userData = JSON.parse(text);
            } catch (e) {
                return error("could not parse json: " + e + "\n" + text);
            }

            const userId = userData["user_id"]
            connectedUsers[socket.id] = userId;
            const newUser = !(userId in data["users"]);

            if (newUser) {
                data["users"][userId] = {};
            }

            data["users"][userId]["username"] = userData["username"];
            write();

            if (newUser) {
                doPatch(socket, [{
                    "op": "replace", "path": "/users/" + userId, "value": data["users"][userId]
                }]);
            }

            socket.emit("authorized", {});
        });

        await addEvent(socket, "get-data", async (_) => {
            socket.emit("data", data);
        });

        await addEvent(socket, "message", async (message) => {
            const channel = message["channel"];
            let content = message["content"];

            const embedPat = "(?:\\s|^)(img|video|audio):(\\S+)(?:\\s|$)"
            let embeds = [];
            for (const embed of content.matchAll(embedPat)) {
                embeds.push({
                    "type": embed[1],
                    "url": embed[2]
                });
            }

            var message = {
                "content": content,
                "user_id": connectedUsers[socket.id],
                "embeds": embeds
            };

            data["channels"][channel]["messages"].push(message);
            write();
            doPatch(socket, [{
                "op": "add", "path": "/channels/" + channel + "/messages/-", "value": message
            }]);
        });
    });

    httpserver.listen(config["port"]);
    console.log("server started");
}

main();

