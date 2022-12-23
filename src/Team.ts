import { Clue } from "./Clue";
import { CountdownTimer } from "./CountdownTimer";
import { AudioManager } from "./operator/AudioManager";
import { Presentation } from "./presentation/Presentation";
import { Settings } from "./Settings";

interface TeamDivs {
    operator: {
        wrapper: HTMLDivElement;
        money: HTMLDivElement;
        teamName: HTMLDivElement;
    };
    presentation: {
        wrapper: HTMLDivElement;
        money: HTMLDivElement;
        teamName: HTMLDivElement;
        buzzerShow: HTMLDivElement;
    };
}

interface TeamStatistics {
    questionsNotBuzzed: number;
    questionsBuzzedThenAnsweredRight: number;
    questionsBuzzedThenAnsweredWrongOrTimedOut: number;
    moneyAtEndOfEachRound: number[]
}

export interface TeamSavedInLocalStorage {
    money: number;
    statistics: TeamStatistics;
}

export class Team {
    public readonly teamName: string;

    private money = 0;
    private countdownDotsInPresentationWindow: HTMLTableElement;
    private readonly settings: Settings;
    private readonly audioManager: AudioManager;
    private readonly presentationInstance: Presentation;
    private readonly teamIdx: number;
    private countdownTimer: CountdownTimer;
    private state: TeamState;
    private stateBeforeLockout: TeamState;
    private progressElementInPresentationWindow: HTMLProgressElement;
    private progressElementInOperatorWindow: HTMLProgressElement;
    private readonly div: TeamDivs = {
        operator: {
            wrapper: null,
            money: null,
            teamName: null
        },
        presentation: {
            wrapper: null,
            money: null,
            teamName: null,
            buzzerShow: null
        }
    };
    public hasBuzzedForCurrentQuestion = false;

    public statistics: TeamStatistics = {
        questionsNotBuzzed: 0,
        questionsBuzzedThenAnsweredRight: 0,
        questionsBuzzedThenAnsweredWrongOrTimedOut: 0,
        moneyAtEndOfEachRound: []
    };

    constructor(teamIdx: number, presentationInstance: Presentation, settings: Settings, audioManager: AudioManager) {
        this.settings = settings;
        this.audioManager = audioManager;
        this.teamIdx = teamIdx;
        this.presentationInstance = presentationInstance;
        this.teamName = `Team ${teamIdx + 1}`;

        this.createElementsInOperatorWindow();
        this.createElementsInPresentationWindow();

        this.setState(TeamState.BUZZERS_OFF);
    }

    public handleAnswerCorrect(clue: Clue): void {
        this.stopAnswer();
        this.audioManager.play("answerCorrect");
        this.moneyAdd(clue.value);
        this.statistics.questionsBuzzedThenAnsweredRight++;
        this.hasBuzzedForCurrentQuestion = true;
    }

    public handleAnswerIncorrectOrAnswerTimeout(clue: Clue): void {
        this.stopAnswer();
        this.audioManager.play("answerIncorrectOrAnswerTimeout");
        this.moneySubtract(clue.value * this.settings.wrongAnswerPenaltyMultiplier);
        this.setState(this.settings.allowMultipleAnswersToSameQuestion ? TeamState.CAN_ANSWER : TeamState.ALREADY_ANSWERED);
        this.statistics.questionsBuzzedThenAnsweredWrongOrTimedOut++;
        this.hasBuzzedForCurrentQuestion = true;
    }

    public moneyAdd(amountAdd: number, animate = true): void {
        if (animate) {
            this.animateMoneyChange(this.money + amountAdd);
        } else {
            this.money += amountAdd;
            this.updateMoneyDisplay();
        }

    }

    public moneySubtract(amountSubtract: number, animate = true): void {
        if (animate) {
            this.animateMoneyChange(this.money - amountSubtract);
        } else {
            this.money -= amountSubtract;
            this.updateMoneyDisplay();
        }
    }

    public moneySet(newMoney: number, animate = true): void {
        if (animate) {
            this.animateMoneyChange(newMoney);

        } else {
            this.money = newMoney;
            this.updateMoneyDisplay();
        }
    }

    private animateMoneyChange(targetMoney: number): void {

        if (this.money === targetMoney) {
            return;
        }

        const DOLLAR_CHANGE_PER_STEP = 100;
        const DELAY_BETWEEN_STEPS_MILLISEC = 50;
        const DIRECTION_MULTIPLIER = targetMoney > this.money ? 1 : -1;

        setTimeout(handleTimeout, DELAY_BETWEEN_STEPS_MILLISEC, this);

        function handleTimeout(instance: Team) {
            const difference = Math.abs(targetMoney - instance.money);

            // teams could loose $50 if the guessing penalty is 0.5, for example
            if (difference >= DOLLAR_CHANGE_PER_STEP) {
                instance.money += DIRECTION_MULTIPLIER * DOLLAR_CHANGE_PER_STEP;
            } else {
                instance.money += DIRECTION_MULTIPLIER * difference;
            }

            instance.updateMoneyDisplay();
            if (instance.money !== targetMoney) {
                setTimeout(handleTimeout, DELAY_BETWEEN_STEPS_MILLISEC, instance);
            }

        }
    }

    public canBuzz(): boolean {
        return this.state === TeamState.CAN_ANSWER;
    }

    public setPaused(isPaused: boolean): void {
        this.countdownTimer?.setPaused(isPaused);
    }

    private updateMoneyDisplay(): void {
        this.div.presentation.money.innerHTML = "$" + this.money.toLocaleString();
        this.div.operator.money.innerHTML = "$" + this.money.toLocaleString();
    }

    private createElementsInPresentationWindow(): void {
        const divTeam = this.div.presentation.wrapper = document.createElement("div");
        divTeam.classList.add("team");
        divTeam.setAttribute("data-team-index", String(this.teamIdx));
        divTeam.setAttribute("data-team-state", "");

        const divBuzzerDisplay = this.div.presentation.buzzerShow = document.createElement("div");
        divBuzzerDisplay.classList.add("buzzer-show");
        divBuzzerDisplay.classList.add("not-pressed");

        const imgSwitchClosed = document.createElement("img");
        imgSwitchClosed.setAttribute("src", "img/switch-closed.svg");
        imgSwitchClosed.classList.add("buzzer-pressed");

        const imgSwitchOpened = document.createElement("img");
        imgSwitchOpened.setAttribute("src", "img/switch-opened.svg");
        imgSwitchOpened.classList.add("buzzer-not-pressed");

        divBuzzerDisplay.append(imgSwitchClosed);
        divBuzzerDisplay.append(imgSwitchOpened);
        divTeam.append(divBuzzerDisplay);

        const tableCountdownDots = this.countdownDotsInPresentationWindow = document.createElement("table");
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

        const divMoney = this.div.presentation.money = document.createElement("div");
        divMoney.classList.add("team-money");
        divMoney.innerHTML = "$" + this.money;
        divTeam.append(divMoney);

        const divName = this.div.presentation.teamName = document.createElement("div");
        divName.classList.add("team-name");
        divName.innerHTML = this.teamName;
        divTeam.append(divName);

        const progress = this.progressElementInPresentationWindow = document.createElement("progress");
        progress.style.display = "none";
        divTeam.append(progress);

        this.presentationInstance.appendTeamDivToFooter(divTeam);

    }

    private createElementsInOperatorWindow(): void {
        const divTeam = this.div.operator.wrapper = document.createElement("div");
        divTeam.classList.add("team");
        divTeam.setAttribute("data-team-index", String(this.teamIdx));
        divTeam.setAttribute("data-team-state", "");

        const divName = this.div.operator.teamName = document.createElement("div");
        divName.classList.add("team-name");
        divName.innerHTML = this.teamName;
        divTeam.append(divName);

        const divMoney = this.div.operator.money = document.createElement("div");
        divMoney.classList.add("team-money");
        divMoney.innerHTML = "$" + this.money;
        divTeam.append(divMoney);

        const progress = this.progressElementInOperatorWindow = document.createElement("progress");
        progress.style.display = "none";
        divTeam.append(progress);

        document.querySelector("footer").prepend(divTeam);

    }


    public setState(targetState: TeamState, endLockout = false): void {
        // TODO talk about why the endLockout boolean is needed
        if (this.state === TeamState.LOCKOUT && !endLockout) {
            this.stateBeforeLockout = targetState;
        } else {
            this.state = targetState;
            this.div.operator.wrapper.setAttribute("data-team-state", targetState);
            this.div.presentation.wrapper.setAttribute("data-team-state", targetState);

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
        countdownShowCategory.addProgressElement(this.progressElementInPresentationWindow);
        this.progressElementInPresentationWindow.style.display = ""; //show it by removing "display=none"
        countdownShowCategory.onFinished = () => this.endLockout();
        countdownShowCategory.start();

    }

    public endLockout(): void {
        this.progressElementInPresentationWindow.style.display = "none";
        this.setState(this.stateBeforeLockout, true);
        this.stateBeforeLockout = null;
        this.countdownTimer = null;
    }

    public startAnswer(): void {
        this.setState(TeamState.ANSWERING);
        this.countdownDotsInPresentationWindow.querySelector("td").classList.add("active");
        this.progressElementInOperatorWindow.style.display = ""; //show it by removing "display=none"
    }

    public stopAnswer(): void {
        this.countdownDotsInPresentationWindow.querySelectorAll("td").forEach(td => td.classList.remove("active"));
        this.progressElementInOperatorWindow.style.display = "none";
    }

    public showKeyDown(): void {
        this.div.presentation.buzzerShow.classList.add("pressed");
        this.div.presentation.buzzerShow.classList.remove("not-pressed");
    }

    public showKeyUp(): void {
        this.div.presentation.buzzerShow.classList.add("not-pressed");
        this.div.presentation.buzzerShow.classList.remove("pressed");
    }

    public getCountdownDotsInPresentationWindow(): HTMLTableElement {
        return this.countdownDotsInPresentationWindow;
    }

    public getProgressElementInOperatorWindow(): HTMLProgressElement {
        return this.progressElementInOperatorWindow;
    }

    public getMoney(): number {
        return this.money;
    }

    public getState(): TeamState {
        return this.state;
    }

    public updateMoneyAtEndOfRound(): void {
        this.statistics.moneyAtEndOfEachRound.push(this.money);
    }

    public getObjectToSaveInLocalStorage(): TeamSavedInLocalStorage {
        return {
            money: this.money,
            statistics: this.statistics
        };
    }

    public loadFromLocalStorage(source: TeamSavedInLocalStorage): void {
        this.moneySet(source.money, false);
        this.statistics = source.statistics;
    }


}

export enum TeamState {
    BUZZERS_OFF = "buzzers-off", // game has not started
    READING_QUESTION = "reading-question", //operator is reading the question out loud
    CAN_ANSWER = "can-answer", //operator is done reading the question
    ANSWERING = "answering",
    ALREADY_ANSWERED = "already-answered", // the team tried answering the question but got it wrong
    LOCKOUT = "lockout" //team buzzed while operator was reading the question
}
