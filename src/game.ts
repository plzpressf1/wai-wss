import { Socket } from "socket.io";
import { GameFlow } from "./flow";

export class Player {
    constructor(socket: Socket, slot: number) {
        this.socket = socket;
        this.slot = slot;
    }

    socket: Socket;
    connected = false;
    slot = 0;
    name = "";
    secret = "";
    picture = "";
}

interface GameSettings {
    timer: boolean;
    playerTime: number; // player time to ask all questions in seconds
    extraTime: number;
    questionsNumber: number;
}

interface GameState {
    started: boolean;
    running: boolean;
}

export class Game {
    constructor() {
        console.log("bootstrapped");
        this.settings = {
            timer: false,
            extraTime: 20,
            playerTime: 120,
            questionsNumber: 3,
        };
        this.state = {
            started: false,
            running: false,
        };
    }

    connectPlayer(id: string, name: string, socket: Socket) {
        let player = this.players.get(id);
        if (!player) {
            if (this.state.started) {
                socket.emit("access", { access: "denied" });
                return;
            }
            player = new Player(socket, this.players.size);
            this.players.set(id, player);
        }
        player.socket = socket;
        player.connected = true;
        player.name = name;
        socket.emit("access", { access: "granted" });
        player.socket.emit("settings/list", { settings: this.settings });
        player.socket.emit("state/list", { state: this.state });
        player.socket.emit("controls/list", { controls: this.flow.prepareControls() })
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
        if (this.state.started) return;
        const player = this.players.get(id);
        if (player) {
            if (player.connected) return;
            const slot = player.slot;
            this.players.delete(id);
            this.fitSlots(slot);
            this.broadcastPlayerList();
        }
    }

    fitSlots(slot: number) {
        for (const player of this.players.values()) {
            if (player.slot > slot) player.slot--;
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
        if (this.settings.timer && this.state.started) return;
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
        this.state.started = false;
        this.broadcastPlayerList();
    }

    updateSettings(settings: GameSettings) {
        this.settings = this.validateSettings(settings);
        if (!this.settings.timer) {
            this.state.started = false;
            this.state.running = false;
            this.flow.setRunning(false);
            this.broadcast("state/list", { state: this.state });
        }
        this.broadcast("settings/list", { settings: this.settings });
    }

    validateSettings(settings: GameSettings) {
        if (settings.questionsNumber < 1) settings.questionsNumber = 1;
        if (settings.questionsNumber > 5) settings.questionsNumber = 5;

        if (settings.playerTime < 15) settings.playerTime = 15;
        if (settings.playerTime > 600) settings.playerTime = 600;

        if (settings.extraTime < 5) settings.extraTime = 5;
        if (settings.extraTime > 60) settings.extraTime = 60;

        return settings;
    }

    setRunning(running: boolean) {
        this.state.running = running;
        if (running) {
            if (!this.state.started) this.start();
            else this.flow.setRunning(running);
        }
        this.broadcast("state/list", { state: this.state });
    }

    start() {
        if (!this.state.running) return;
        this.state.started = true;
        this.flow.start(this.players);
    }

    getNextPlayerId(id: string) {
        let slot = 0;
        if (id) {
            const player = this.players.get(id);
            if (player) slot = player.slot + 1;
            if (slot >= this.players.size) slot = 0;
        }
        for (const [key, player] of this.players.entries()) {
            if (player.slot === slot) return key;
        }
        return "";
    }

    getPlayerSlot(id: string) {
        const player = this.players.get(id);
        return player?.slot ?? 0;
    }

    isPlayerConnected(id: string) {
        const player = this.players.get(id);
        return player?.connected ?? false;
    }

    broadcast(event: string, payload: any) {
        for (const player of this.players.values()) {
            if (player.connected) {
                player.socket?.emit(event, payload);
            }
        }
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
    public settings: GameSettings;
    private readonly state: GameState;
    readonly flow: GameFlow = new GameFlow(this);
}
