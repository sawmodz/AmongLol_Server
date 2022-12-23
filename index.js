const express = require("express");
const { cp } = require("fs");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const match = {};

const shuffleArray = (inputArray) => {
  inputArray.sort(() => Math.random() - 0.5);
};

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

  socket.on("kickPlayer", (message) => {
    myMatch = match[message.code];
    myMatch.users = myMatch.users.filter((user) => {
      return user != message.user;
    });
    match[message.code] = myMatch;
    io.sockets.to(message.code).emit("kickPlayer", { user: message.user });
  });

  socket.on("startGame", (message) => {
    const room = io.sockets.adapter.rooms.get(message.code);
    if (room === undefined) return;
    let roles = [1, 2, 3, 4, 5];
    shuffleArray(roles);
    let i = 0;
    io.sockets.adapter.rooms.get(message.code).forEach((user) => {
      io.sockets.to(user).emit("roles", { roles: roles[i] });
      i++;
    });
  });

  socket.on("leaveParty", (message) => {
    socket.leave(message.code);
  });

  socket.on("chooseRoles", (message) => {
    if (match[message.code] === undefined) return;
    let myMatch = match[message.code];
    myMatch.status = 2;
    match[message.code] = myMatch;
    io.sockets
      .to(message.code)
      .emit("chooseRoles", { match: myMatch, status: 2 });
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

      socket.emit("joinParty", { error: 0, match: match[message.code] });
      return;
    }
    const sizeOfRoom = Array.from(room).length;
    if (sizeOfRoom == 5) {
      socket.emit("joinParty", { error: 2 });
      return;
    } else {
      socket.join(message.code);
      const myMatch = match[message.code];
      if (myMatch.users.includes(message.nickname)) {
        socket.emit("joinParty", { id: message.code, match: myMatch });
        return;
      }
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
