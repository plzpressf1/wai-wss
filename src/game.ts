import { Socket } from "socket.io";

class Player {
    constructor(socket: Socket) {
        this.socket = socket;
    }

    socket: Socket;
    connected = false;
    name = "";
    secret = "";
}

export class Game {
    constructor() {
        console.log("bootstrapped");
    }

    connectPlayer(id: string, name: string, socket: Socket) {
        let player = this.players.get(id);
        if (!player) {
            player = new Player(socket);
            this.players.set(id, player);
        }
        player.socket = socket;
        player.connected = true;
        player.name = name;
        this.broadcast("player/list", { players: this.preparePlayers() });
    }

    disconnectPlayer(id: string) {
        const player = this.players.get(id);
        if (player) {
            player.connected = false;
            if (this.isEmpty()) {
                this.players = new Map();
            }
        }
    }

    changePlayer(id: string, field: string, value: string) {
        const player = this.players.get(id);
        if (player) {
            // @ts-ignore
            player[field] = value;
            this.broadcast("player/list", { players: this.preparePlayers() });
        }
    }

    private broadcast(event: string, payload: any) {
        for (const player of this.players.values()) {
            if (player.connected) {
                player.socket?.emit(event, payload);
            }
        }
    }

    private preparePlayers() {
        const players = [];
        for (const [id, player] of this.players.entries()) {
            players.push({
                id,
                name: player.name,
                secret: player.secret,
                connected: player.connected,
            });
        }
        return players;
    }

    private isEmpty() {
        for (const player of this.players.values()) {
            if (player.connected) return false;
        }
        return true;
    }

    private players: Map<string, Player> = new Map();
}
