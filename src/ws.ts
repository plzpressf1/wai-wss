import { v4 as uuid } from "uuid";
import { game, io } from "./index";

io.on("connection", (socket) => {
    const queryId: string = socket.handshake.query.id?.toString() ?? "";
    const id = queryId ? queryId : uuid();
    const name: string = socket.handshake.query.name?.toString() ?? "";

    if (!queryId) {
        socket.emit("player/id", id);
    }
    console.log("conn", id);
    game.connectPlayer(id, name, socket);

    socket.on("connect_error", (err) => {
        console.log(`connect_error due to ${err.message}`);
    });

    socket.on("disconnect", () => {
        console.log("disc", id);
        game.disconnectPlayer(id);
    });

    socket.on("player/change", ({ id, field, value }) => {
        game.changePlayer(id, field, value);
    });

    socket.on("player/roll", () => {
        game.rollPlayers();
    });

    socket.on("player/kick", ({ id }) => {
        game.kickPlayer(id);
    });

    socket.on("settings/change", ({ settings }) => {
        game.updateSettings(settings);
    });

    socket.on("state/running", ({ running }) => {
        game.setRunning(running);
    });

    socket.on("flow/decision", ({ id, decision }) => {
        game.flow.changeDecision(id, decision);
    });
});
