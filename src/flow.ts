import { Game, Player } from "./game";
import { clearInterval } from "timers";

enum QuestionStatus {
    Default,
    Yes,
    No,
}

enum DecisionStatus {
    Default,
    Yes,
    No,
    Doubt,
}

class PlayerControls {
    public questionStage = false;
    public question = 0;
    public questions: QuestionStatus[] = [];
    public decision = DecisionStatus.Default;
}

export class GameFlow {
    constructor(game: Game) {
        this.game = game;
    }

    start(players: Map<string, Player>) {
        this.playersControls.clear();
        for (const id of players.keys()) {
            this.playersControls.set(id, new PlayerControls())
        }
        this.clearQuestions();
        this.currentPlayer = "";
        this.nextPlayer();
        clearInterval(this.timerHandler);
        this.timerHandler = setInterval(this.updateTimer.bind(this), 1000);
    }

    setRunning(running: boolean) {
        if (running) {
            clearInterval(this.timerHandler);
            this.timerHandler = setInterval(this.updateTimer.bind(this), 1000);
        }
        else {
            clearInterval(this.timerHandler);
        }
    }

    clearQuestions() {
        for (const pc of this.playersControls.values()) {
            pc.questions = [];
            for (let i = 0; i < this.game.settings.questionsNumber; i++) {
                pc.questions.push(QuestionStatus.Default);
            }
        }
    }

    clearDecisions() {
        for (const pc of this.playersControls.values()) {
            pc.decision = DecisionStatus.Default;
        }
    }

    nextPlayer() {
        this.currentPlayer = this.game.getNextPlayerId(this.currentPlayer);

        this.clearDecisions();
        // clear current player questions
        const pc = this.playersControls.get(this.currentPlayer);
        if (pc) {
            pc.question = 0;
            pc.questions = pc.questions.map(() => QuestionStatus.Default);
        }

        // timer
        this.timer = this.game.settings.playerTime;

        // broadcast
        this.broadcast();
    }

    changeDecision(id: string, decision: DecisionStatus) {
        const pc = this.playersControls.get(id);
        if (pc) {
            if (pc.decision === decision) pc.decision = DecisionStatus.Default;
            else pc.decision = decision;

            const selectedDecision = this.selectDecision();
            if (selectedDecision === DecisionStatus.Doubt) {
                this.extraTime();
            }
            else if (selectedDecision !== DecisionStatus.Default) {
                const status = selectedDecision === DecisionStatus.Yes ? QuestionStatus.Yes : QuestionStatus.No;
                this.addQuestionStatus(status);
            }

            this.broadcast();
        }
    }

    addQuestionStatus(status: QuestionStatus) {
        const pc = this.playersControls.get(this.currentPlayer);
        if (pc) {
            pc.questions[pc.question++] = status;
            if (status === QuestionStatus.No || pc.question >= this.game.settings.questionsNumber) {
                this.nextPlayer();
            }
            this.clearDecisions();
        }
    }

    extraTime() {
        this.clearDecisions();
        this.timer += this.game.settings.extraTime;
    }

    selectDecision() {
        let askerIndex = this.game.getPlayerSlot(this.currentPlayer) - 1;
        if (askerIndex < 0) askerIndex = this.playersControls.size - 1;

        const results = {
            potential: 0,
            yes: 0,
            no: 0,
            doubt: 0,
        };
        for (const [id, pc] of this.playersControls.entries()) {
            if (pc.questionStage) continue;
            if (!this.game.isPlayerConnected(id)) continue;
            const points = this.game.getPlayerSlot(id) === askerIndex ? 1.5 : 1;
            switch (pc.decision) {
                case DecisionStatus.Default: results.potential += points; break;
                case DecisionStatus.Yes: results.yes += points; break;
                case DecisionStatus.No: results.no += points; break;
                case DecisionStatus.Doubt: results.doubt += points; break;
            }
        }
        // yes
        const yes = results.yes - results.potential;
        if (yes > results.no && yes > results.doubt) return DecisionStatus.Yes;
        // no
        const no = results.no - results.potential;
        if (no > results.yes && no > results.doubt) return DecisionStatus.No;
        // doubt
        const doubt = results.doubt - results.potential;
        if (doubt > results.yes && doubt > results.no) return DecisionStatus.Doubt;
        // default
        return DecisionStatus.Default;
    }

    private updateTimer() {
        this.timer--;
        if (this.timer <= 0 || !this.game.isPlayerConnected(this.currentPlayer)) {
            this.nextPlayer();
        }
        else {
            this.broadcast();
        }
    }

    prepareControls() {
        const controls = [];
        for (const [id, pc] of this.playersControls.entries()) {
            pc.questionStage = id === this.currentPlayer;
            controls.push({
                id,
                slot: this.game.getPlayerSlot(id),
                questionStage: pc.questionStage,
                questions: pc.questions,
                decision: pc.decision,
                timer: this.timer,
            });
        }
        controls.sort((a, b) => a.slot - b.slot);
        return controls;
    }

    private broadcast() {
        const controls = this.prepareControls();
        this.game.broadcast("controls/list", { controls, timer: this.timer });
    }

    private readonly game: Game;
    private playersControls = new Map<string, PlayerControls>();
    private currentPlayer = "";
    private timerHandler: NodeJS.Timeout | undefined;
    private timer = 0;
}
