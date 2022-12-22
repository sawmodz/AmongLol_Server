const express = require("express");
const { cp } = require("fs");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const match = {};

const uuid = () => {
  return "xxxx-xxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

io.on("connection", (socket) => {
  socket.on("createParty", (message) => {
    const id = uuid();
    myMatch = {
      owner: message.nickname,
      users: [message.nickname],
      status: 0,
      id: id,
      nickname: message.nickname,
    };
    match[id] = myMatch;
    socket.join(id);
    socket.emit("createParty", {
      id: id,
      match: myMatch,
    });
  });

  socket.on("joinParty", (message) => {
    const room = io.sockets.adapter.rooms.get(message.code);
    if (room === undefined) {
      if (match[message.code] === undefined) {
        socket.emit("joinParty", { error: 1 });
        return;
      }
      if (match[message.code].owner === message.nickname) {
        socket.join(message.code);
      }

      socket.emit("joinParty", { error: 1 });
      return;
    }
    const sizeOfRoom = Array.from(room).length;
    if (sizeOfRoom == 5) {
      socket.emit("joinParty", { error: 2 });
      return;
    } else {
      socket.join(message.code);
      const myMatch = match[message.code];
      if (myMatch.users.includes(message.nickname)) return;
      myMatch.nickname = message.nickname;
      myMatch.users.push(message.nickname);
      match[message.code] = myMatch;
      socket.emit("joinParty", { id: message.code, match: myMatch });
      io.sockets.to(message.code).emit("playerJoin", { match: myMatch });
    }
  });
});

server.listen(3000, () => {
  console.log("Server On");
});

//OwnerName : ""
//Users : []
//Status : int
// 0: Waiting
