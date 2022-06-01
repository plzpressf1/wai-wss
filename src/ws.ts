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

    socket.on("player/name", ({ id, name }) => {
        game.changePlayerName(id, name);
    });

});