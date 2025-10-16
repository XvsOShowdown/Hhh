const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 12345 });
let rooms = {};

server.on("connection", (ws) => {
  ws.room = null;

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      ws.room = data.room;
      if (!rooms[ws.room]) rooms[ws.room] = new Set();
      if (rooms[ws.room].size >= 2) {
        ws.send(JSON.stringify({ type: "error", message: "Room is full!" }));
        return;
      }
      rooms[ws.room].add(ws);
      return;
    }

    if (data.type === "send") {
      let { name, state, move } = data;
      ws.move = move;
      ws.state = state;
      ws.name = name;

      // Get the other player
      let other = [...rooms[ws.room]].find(p => p !== ws);

      if (!other) return; // wait until both players are connected

      let othern = other.name;
      let otherst = other.state;
      let otherm = other.move;

      if (otherst === "ready" && ws.state === "ready") {
        function getWinner(move1, move2) {
          if (move1 === move2) return "draw";
          if (
            (move1 === "rock" && move2 === "scissors") ||
            (move1 === "paper" && move2 === "rock") ||
            (move1 === "scissors" && move2 === "paper")
          ) return ws.name;
          return othern;
        }

        let winner = getWinner(ws.move, otherm);

        // send results to both players
        ws.send(JSON.stringify({ type: "result", yourMove: ws.move, otherMove: otherm, winner }));
        other.send(JSON.stringify({ type: "result", yourMove: otherm, otherMove: ws.move, winner }));
      }
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room].delete(ws);
      if (rooms[ws.room].size === 0) delete rooms[ws.room];
    }
  });
});
