import { Server } from "socket.io";
import { Game } from "./game";

require("dotenv").config();

export const io = new Server(Number(process.env.PORT),{
    path: "/game",
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"]
    }
});

export const game = new Game();

require("./ws");
