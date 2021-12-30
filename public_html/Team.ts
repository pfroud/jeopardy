import { Presentation } from "./presentation/Presentation.js";
import { Settings } from "./Settings.js";
import { AudioManager } from "./operator/AudioManager.js";
import { Clue } from "./operator/Operator.js";
import { CountdownTimer } from "./CountdownTimer.js";

interface TeamDivs {
    operator: {
        wrapper: HTMLDivElement;
        dollars: HTMLDivElement;
        teamName: HTMLDivElement;
        state: HTMLDivElement;
    };
    presentation: {
        wrapper: HTMLDivElement;
        dollars: HTMLDivElement;
        teamName: HTMLDivElement;
        buzzerShow: HTMLDivElement;
    };
}

export class Team {
    public readonly teamName: string;
    public dollars = 0;
    public presentationCountdownDots: HTMLTableElement;

    private readonly settings: Settings;
    private readonly audioManager: AudioManager;
    private readonly presentationInstance: Presentation;
    private readonly teamIdx: number;
    private countdownTimer: CountdownTimer;
    private state: TeamState;
    private stateBeforeLockout: TeamState;
    private presentationProgressLockout: HTMLProgressElement;
    private readonly div: TeamDivs = {
        operator: {
            wrapper: null,
            dollars: null,
            teamName: null,
            state: null
        },
        presentation: {
            wrapper: null,
            dollars: null,
            teamName: null,
            buzzerShow: null
        }
    };

    constructor(teamIdx: number, presentationInstance: Presentation, settings: Settings, audioManager: AudioManager) {
        this.settings = settings;
        this.audioManager = audioManager;
        this.teamIdx = teamIdx;
        this.presentationInstance = presentationInstance;
        this.teamName = `Team ${teamIdx + 1}`;

        /*
         this.statistics = {
         answerRight: 0,
         answerWrong:0,
         answerTimeout: 0,
         buzzTooEarly: 0
         };
         */

        this.createDivsOperator();
        this.createDivsPresentation();

        this.setState(TeamState.BUZZERS_OFF);
    }

    public handleAnswerCorrect(clueObj: Clue): void {
        this.audioManager.play("answerCorrect");
        this.moneyAdd(clueObj.value);
        this.presentationCountdownDots.querySelectorAll("td").forEach(td => td.classList.remove("active"));
    }

    public handleAnswerIncorrectOrAnswerTimeout(clueObj: Clue): void {
        this.audioManager.play("answerIncorrectOrAnswerTimeout");
        this.presentationCountdownDots.querySelectorAll("td").forEach(td => td.classList.remove("active"));
        this.moneySubtract(clueObj.value * this.settings.wrongAnswerPenaltyMultiplier);
        this.setState(this.settings.allowMultipleAnswersToSameQuestion ? TeamState.CAN_ANSWER : TeamState.ALREADY_ANSWERED);
    }

    public moneyAdd(amountAdd: number): void {
        this.animateDollarsChange(this.dollars + amountAdd);
    }

    public moneySubtract(amountSubtract: number): void {
        this.animateDollarsChange(this.dollars - amountSubtract);
    }

    public moneySet(newDollars: number): void {
        this.animateDollarsChange(newDollars);
    }

    private animateDollarsChange(targetDollars: number): void {

        if (this.dollars === targetDollars) {
            return;
        }

        const DOLLAR_CHANGE_PER_STEP = 100;
        const DELAY_BETWEEN_STEPS_MS = 50;
        const DIRECTION_MULTIPLIER = targetDollars > this.dollars ? 1 : -1;

        setTimeout(handleTimeout, DELAY_BETWEEN_STEPS_MS, this);

        function handleTimeout(instance: Team) {
            const difference = Math.abs(targetDollars - instance.dollars);

            // check why this is needed, some questions have $50 increments?
            if (difference >= DOLLAR_CHANGE_PER_STEP) {
                instance.dollars += DIRECTION_MULTIPLIER * DOLLAR_CHANGE_PER_STEP;
            } else {
                instance.dollars += DIRECTION_MULTIPLIER * difference;
            }

            instance.updateDollarsDisplay();
            if (instance.dollars !== targetDollars) {
                setTimeout(handleTimeout, DELAY_BETWEEN_STEPS_MS, instance);
            }

        }
    }

    public canBuzz(): boolean {
        return this.state === TeamState.CAN_ANSWER;
    }

    public setPaused(isPaused: boolean): void {
        if (this.countdownTimer) {
            if (isPaused) {
                this.countdownTimer.pause();
            } else {
                this.countdownTimer.resume();
            }
        }
    }

    private updateDollarsDisplay(): void {
        this.div.presentation.dollars.innerHTML = "$" + this.dollars.toLocaleString();
        this.div.operator.dollars.innerHTML = "$" + this.dollars.toLocaleString();
    }

    private createDivsPresentation(): void {
        const divTeam = this.div.presentation.wrapper = document.createElement("div");
        divTeam.classList.add("team");
        divTeam.setAttribute("data-team-index", String(this.teamIdx));
        divTeam.setAttribute("data-team-state", "");

        const divBuzzerDisplay = this.div.presentation.buzzerShow = document.createElement("div");
        divBuzzerDisplay.classList.add("buzzer-show");
        divBuzzerDisplay.classList.add("not-pressed");

        const imgSwitchClosed = document.createElement("img");
        imgSwitchClosed.setAttribute("src", "img/switch-closed.svg");
        imgSwitchClosed.setAttribute("attr", "switch closed");
        imgSwitchClosed.classList.add("buzzer-pressed");

        const imgSwitchOpened = document.createElement("img");
        imgSwitchOpened.setAttribute("src", "img/switch-opened.svg");
        imgSwitchOpened.setAttribute("attr", "switch opened");
        imgSwitchOpened.classList.add("buzzer-not-pressed");

        divBuzzerDisplay.append(imgSwitchClosed);
        divBuzzerDisplay.append(imgSwitchOpened);
        divTeam.append(divBuzzerDisplay);

        const tableCountdownDots = this.presentationCountdownDots = document.createElement("table");
        tableCountdownDots.classList.add("countdown-dots");

        for (let i = 5; i > 1; i--) {
            const tdDescending = document.createElement("td");
            tdDescending.setAttribute("data-countdown", String(i));
            tableCountdownDots.appendChild(tdDescending);
        }

        const tdOne = document.createElement("td");
        tdOne.setAttribute("data-countdown", "1");
        tableCountdownDots.appendChild(tdOne);

        for (let i = 2; i <= 5; i++) {
            const tdAscending = document.createElement("td");
            tdAscending.setAttribute("data-countdown", String(i));
            tableCountdownDots.appendChild(tdAscending);
        }

        divTeam.append(tableCountdownDots);

        const divDollars = this.div.presentation.dollars = document.createElement("div");
        divDollars.classList.add("team-dollars")
        divDollars.innerHTML = "$" + this.dollars;
        divTeam.append(divDollars);

        const divName = this.div.presentation.teamName = document.createElement("div");
        divName.classList.add("team-name")
        divName.innerHTML = this.teamName;
        divTeam.append(divName);

        const progress = this.presentationProgressLockout = document.createElement("progress");
        divTeam.append(progress);

        this.presentationInstance.appendTeamDivToFooter(divTeam);

    }

    private createDivsOperator(): void {
        const divTeam = this.div.operator.wrapper = document.createElement("div");
        divTeam.classList.add("team");
        divTeam.setAttribute("data-team-index", String(this.teamIdx));
        divTeam.setAttribute("data-team-state", "");

        const divName = this.div.operator.teamName = document.createElement("div");
        divName.classList.add("team-name")
        divName.innerHTML = this.teamName;
        divTeam.append(divName);

        const divDollars = this.div.operator.dollars = document.createElement("div");
        divDollars.classList.add("team-dollars")
        divDollars.innerHTML = "$" + this.dollars;
        divTeam.append(divDollars);

        const divState = this.div.operator.state = document.createElement("div");
        divState.classList.add("team-state")
        divState.innerHTML = this.state;
        divTeam.append(divState);

        const progress = document.createElement("progress");
        progress.classList.add("time-left")
        progress.style.display = "none";
        divTeam.append(progress);

        document.querySelector("footer").appendChild(divTeam);

    }


    public setState(targetState: TeamState, endLockout = false): void {
        // TODO talk about why the endLockout boolean is needed
        if (this.state === TeamState.LOCKOUT && !endLockout) {
            this.stateBeforeLockout = targetState;
        } else {
            this.state = targetState;
            this.div.operator.wrapper.setAttribute("data-team-state", targetState);
            this.div.presentation.wrapper.setAttribute("data-team-state", targetState);
            this.div.operator.state.innerHTML = this.state;

            if (this.countdownTimer) {
                this.countdownTimer.pause();
                this.countdownTimer = null;
            }
        }
    }

    public canBeLockedOut(): boolean {
        return this.state === TeamState.READING_QUESTION;
    }

    public startLockout(): void {
        this.stateBeforeLockout = this.state;
        this.setState(TeamState.LOCKOUT);

        const countdownShowCategory = this.countdownTimer = new CountdownTimer(this.settings.durationLockoutMillisec);
        // todo would be nice to show progress element on display and presentation. need to change CountdownTimer to allow that
        countdownShowCategory.progressElements.push(this.presentationProgressLockout);
        countdownShowCategory.hideProgressOnFinish = true;
        countdownShowCategory.onFinished = () => this.endLockout();
        countdownShowCategory.start();

    }

    public endLockout(): void {
        this.setState(this.stateBeforeLockout, true);
        this.stateBeforeLockout = null;
        this.countdownTimer = null;
    }

    public startAnswer(): void {
        this.setState(TeamState.ANSWERING);
        this.presentationCountdownDots.querySelector("td").classList.add("active");
    }

    public showKeyDown(): void {
        this.div.presentation.buzzerShow.classList.add("pressed");
        this.div.presentation.buzzerShow.classList.remove("not-pressed");
    }

    public showKeyUp(): void {
        this.div.presentation.buzzerShow.classList.add("not-pressed");
        this.div.presentation.buzzerShow.classList.remove("pressed");
    }

    public jsonDump(): TeamDumpToJson {
        return {
            name: this.teamName,
            dollars: this.dollars
        };
    }

    /*
    public jsonLoad(jsonObj: TeamDumpToJson): void {
        this.teamName = jsonObj.name;
        this.dollars = jsonObj.dollars;

        this.div.presentation.dollars.innerHTML = "$" + this.dollars;
        this.div.presentation.teamName.innerHTML = this.teamName;

        this.div.operator.teamName.innerHTML = this.teamName;
        this.div.operator.dollars.innerHTML = "$" + this.dollars;
    }
    */

}

export interface TeamDumpToJson {
    name: string;
    dollars: number;
}

export enum TeamState {
    BUZZERS_OFF = "buzzers-off", // game has not started
    READING_QUESTION = "reading-question", //operator is reading the question out loud
    CAN_ANSWER = "can-answer", //operator is done reading the question
    ANSWERING = "answering",
    ALREADY_ANSWERED = "already-answered", // the team tried answering the question but got it wrong
    LOCKOUT = "lockout" //team buzzed while operator was reading the question
}

