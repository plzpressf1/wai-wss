import { Socket } from "socket.io";

class Player {
    constructor(socket: Socket) {
        this.socket = socket;
    }

    socket: Socket;
    connected = false;
    slot = 0;
    name = "";
    secret = "";
    picture = "";
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
        this.broadcastPlayerList();
    }

    disconnectPlayer(id: string) {
        const player = this.players.get(id);
        if (player) {
            player.connected = false;
            if (this.isEmpty()) {
                this.players = new Map();
            }
            else {
                this.broadcastPlayerList();
            }
        }
    }

    kickPlayer(id: string) {
        const player = this.players.get(id);
        if (player) {
            if (player.connected) return;
            this.players.delete(id);
            this.broadcastPlayerList();
        }
    }

    changePlayer(id: string, field: string, value: string) {
        const player = this.players.get(id);
        if (player) {
            // @ts-ignore
            player[field] = value;
            this.broadcastPlayerList();
        }
    }

    rollPlayers() {
        const rolls = [];
        for (const id of this.players.keys()) {
            rolls.push(id);
        }
        let i = 0;
        while (rolls.length) {
            const index = Math.floor(Math.random() * rolls.length);
            // @ts-ignore
            const player = this.players.get(rolls[index]);
            if (player) player.slot = i++;
            rolls.splice(index, 1);
        }
        this.broadcastPlayerList();
    }

    private broadcastPlayerList() {
        for (const [id, player] of this.players.entries()) {
            if (player.connected) {
                player.socket?.emit("player/list", {
                    players: this.preparePlayers(id)
                });
            }
        }
    }

    private preparePlayers(me: string) {
        const players = [];
        for (const [id, player] of this.players.entries()) {
            if (me === id) {
                players.push({
                    id,
                    slot: player.slot,
                    name: player.name,
                    connected: player.connected,
                });
            }
            else {
                players.push({
                    id,
                    slot: player.slot,
                    name: player.name,
                    secret: player.secret,
                    picture: player.picture,
                    connected: player.connected,
                });
            }
        }
        players.sort((a, b) => a.slot - b.slot);
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
