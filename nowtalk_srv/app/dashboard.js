
/*jshint esversion: 10 */
"use strict";

import { constants, createServer } from "http2";
import { readFileSync } from 'fs';
import { hrtime } from 'process';


import { Server } from "socket.io";

const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_INTERNAL_SERVER_ERROR
} = constants;

const options = {
   // key: readFileSync('https/selfsigned.key'),
   // cert: readFileSync('https/selfsigned.crt')
}

const users = [];

// Join user to chat
function userJoin(id, username, room) {
    const user = { id, username, room };

    users.push(user);

    return user;
}

// Get current user
function getCurrentUser(id) {
    return users.find(user => user.id === id);
}

// User leaves chat
function userLeave(id) {
    const index = users.findIndex(user => user.id === id);

    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
}

function userCount() {
    return users.size;
}



const MAX_MSGS = 100;

class Dashboard {
    constructor(main) {
        // super();
        this.main = main;
        this.config = main.config;
        this.nodes = [];
        this.msgs = [];
        this.clients = [];
        this.timer = false;
        this.onUpdateBadges = this.onUpdateBadges.bind(this);
        this.requestListener = this.requestListener.bind(this);

        this.server =  createServer(options, this.requestListener);
            // http.createServer(this.requestListener);
        this.io = new Server(this.server);

        this.io.on('connection', socket => {
            const user = userJoin(socket.id, 'username', 'room');
            // handle newBadge return
            socket.on("newBadge", data => {
                if (typeof data === "boolean") {
                    socket.broadcast.emit("newBadge", false);
                }
                this.main.emit("web_newBadge", data);
            });
            socket.on("editBadge", (mac,action,value) => {
            //    console.warn('web_editBadge', mac, action, value);
                this.main.emit("web_editBadge", mac, action, value);
            });
            // Runs when client disconnects
            socket.on('disconnect', () => {
                const user = userLeave(socket.id);
            });

            socket.emit('config', this.config);
            socket.emit('msgs', this.msgs);
            this.onUpdateBadges(socket);
        });

        this.server.listen( 8099 );

        this.timer = setInterval(this.onUpdateBadges, 2500, this.io);
    }

    stop() {
        clearInterval(this.timer);
        this.clients.forEach(connection => {
            if (!connection) return;
            connection.end();
        });
        this.server.close();
    }

    requestListener(req, res) {
        //     res.setHeader('Access-Control-Allow-Origin', this.config.sitebaseURL);
        res.setHeader('Access-Control-Request-Method', 'GET');
        //        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST,GET');
        res.setHeader('Access-Control-Allow-Headers', '*');
        /*         if (req.method === 'OPTIONS') return res.end();
                if (req.method === 'POST' && req.url === '/p') {

                    var body = "", http = this;
                    req.on("data", function (chunk) {
                        body += chunk;
                    });

                    req.on("end", function () {
                        http.postRequest(req, res, parse(body));
                        res.end('ok');
                    });
                }
         */
        if (req.method === 'GET' && req.url === '/client.js') {
            res.setHeader('Content-type', 'text/javascript');
            res.writeHead(200);
            return res.end(readFileSync("./webpages/client.js"));
        }
        if (req.method === 'GET' && req.url === '/espserial.js') {
            res.setHeader('Content-type', 'text/javascript');
            res.writeHead(200);
            return res.end(readFileSync("./utils/espserial.js"));
        }

        switch (req.url) {
            case "":
            case "/":
                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                //       this.indexFile =;
                res.end(readFileSync("./webpages/index.html"));
                break;
            default:
                res.writeHead(404);
                res.end(JSON.stringify({ error: "Resource not found" }));
        }
    }

    updateConfig(connections = false) {
        this.io.emit('config',  this.config);
    }

    addNewBadge(data) {
        this.io.emit('newBadge', data);
        return userCount() !== 0;
    }

    addMessage(kind, msg) {
        while (this.msgs.length > MAX_MSGS) {
            this.msgs.shift();
        }
        this.msgs.push([kind, msg]);
        this.io.emit('msg', kind, msg);
    }

    updateSingleBadge(badge) {
        this.io.emit('update', [badge.info(true)], false);
    }

    onUpdateBadges(socket) {
        let list = [];
        socket = socket || this.io;
        for (const [key, value] of Object.entries(this.main.users)) {
            list.push(value.info(true));
        }
        socket.emit('update', list, hrtime.bigint().toString());
    }

}

export default Dashboard;
