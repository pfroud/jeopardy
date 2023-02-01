import { Clue } from "./Clue";
import { querySelectorAndCheck } from "./common";
import { CountdownTimer } from "./CountdownTimer";
import { AudioManager } from "./operator/AudioManager";
import { Operator } from "./operator/Operator";
import { Presentation } from "./presentation/Presentation";
import { Settings } from "./Settings";

interface Statistics {
    questionsNotBuzzed: number;
    questionsBuzzedThenAnsweredRight: number;
    questionsBuzzedThenAnsweredWrongOrTimedOut: number;
    moneyAtEndOfEachRound: number[]
}

export type TeamState =
    "buzzers-off" | // game has not started
    "operator-is-reading-question" |
    "can-answer" | //operator is done reading the question
    "answering" |
    "already-answered-this-clue" |
    "lockout" //team buzzed while operator was reading the question
    ;


export interface TeamSavedInLocalStorage {
    readonly money: number;
    readonly statistics: Statistics;
}

export class Team {
    public readonly teamName: string;

    private money = 0;
    private countdownDotsInPresentationWindow?: HTMLTableElement;
    private readonly settings: Settings;
    private readonly audioManager: AudioManager;
    private readonly presentation: Presentation;
    private readonly operator: Operator;
    private readonly teamIdx: number;
    /** One countdown timer used to keep track of all timing for this Team */
    private countdownTimer?: CountdownTimer | null;
    private state: TeamState;
    private stateBeforeLockout?: TeamState | null;
    private progressElementInPresentationWindow?: HTMLProgressElement;
    private progressElementInOperatorWindow?: HTMLProgressElement;
    private readonly div: {
        readonly operator: {
            wrapper: HTMLDivElement | null;
            money: HTMLDivElement | null;
            teamName: HTMLDivElement | null;
            state: HTMLDivElement | null;
        };
        readonly presentation: {
            wrapper: HTMLDivElement | null;
            money: HTMLDivElement | null;
            teamName: HTMLDivElement | null;
            buzzerShow: HTMLDivElement | null;
        };
    } = {
            operator: {
                wrapper: null,
                money: null,
                teamName: null,
                state: null
            },
            presentation: {
                wrapper: null,
                money: null,
                teamName: null,
                buzzerShow: null
            }
        };
    public hasBuzzedForCurrentQuestion = false;

    public statistics: Statistics = {
        questionsNotBuzzed: 0,
        questionsBuzzedThenAnsweredRight: 0,
        questionsBuzzedThenAnsweredWrongOrTimedOut: 0,
        moneyAtEndOfEachRound: []
    };

    public constructor(teamIdx: number, operator: Operator, presentation: Presentation, settings: Settings, audioManager: AudioManager) {
        this.settings = settings;
        this.audioManager = audioManager;
        this.teamIdx = teamIdx;
        this.presentation = presentation;
        this.operator = operator;
        this.teamName = `Team ${teamIdx + 1}`;

        this.createElementsInOperatorWindow();
        this.createElementsInPresentationWindow();

        // suppress TS2564 "property has no initializer and is not assigned in the constructor"
        this.state = "buzzers-off";
        this.setState("buzzers-off");
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
        this.setState(this.settings.allowMultipleAnswersToSameQuestion ? "can-answer" : "already-answered-this-clue");
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

        const handleTimeout = (): void => {
            const difference = Math.abs(targetMoney - this.money);

            // teams could loose $50 if the guessing penalty is 0.5, for example
            if (difference >= DOLLAR_CHANGE_PER_STEP) {
                this.money += DIRECTION_MULTIPLIER * DOLLAR_CHANGE_PER_STEP;
            } else {
                this.money += DIRECTION_MULTIPLIER * difference;
            }

            this.updateMoneyDisplay();
            if (this.money !== targetMoney) {
                setTimeout(handleTimeout, DELAY_BETWEEN_STEPS_MILLISEC, this);
            }

        };

        setTimeout(handleTimeout, DELAY_BETWEEN_STEPS_MILLISEC);

    }

    public canBuzz(): boolean {
        return this.state === "can-answer";
    }

    public setPaused(isPaused: boolean): void {
        this.countdownTimer?.setPaused(isPaused);
    }

    private updateMoneyDisplay(): void {
        if (this.div.presentation.money) {
            this.div.presentation.money.innerHTML = "$" + this.money.toLocaleString();
        }
        if (this.div.operator.money) {
            this.div.operator.money.innerHTML = "$" + this.money.toLocaleString();
        }
    }

    private createElementsInPresentationWindow(): void {
        const divTeam = this.div.presentation.wrapper = document.createElement("div");
        divTeam.classList.add("team");
        divTeam.setAttribute("data-team-index", String(this.teamIdx));
        divTeam.setAttribute("data-team-state", "");

        const divBuzzerDisplay = this.div.presentation.buzzerShow = document.createElement("div");
        divBuzzerDisplay.classList.add("buzzer-show");
        divBuzzerDisplay.classList.add("not-pressed");

        // https://parceljs.org/languages/svg/#url-references
        const switchClosedSvg = new URL("./presentation/img/switch-closed.svg", import.meta.url);
        const switchOpenSvg = new URL("./presentation/img/switch-opened.svg", import.meta.url);

        const imgSwitchClosed = document.createElement("img");
        imgSwitchClosed.setAttribute("src", switchClosedSvg.toString());
        imgSwitchClosed.classList.add("buzzer-pressed");

        const imgSwitchOpened = document.createElement("img");
        imgSwitchOpened.setAttribute("src", switchOpenSvg.toString());
        imgSwitchOpened.classList.add("buzzer-not-pressed");

        divBuzzerDisplay.append(imgSwitchClosed);
        divBuzzerDisplay.append(imgSwitchOpened);
        divTeam.append(divBuzzerDisplay);

        const tableCountdownDots = this.countdownDotsInPresentationWindow = document.createElement("table");
        tableCountdownDots.classList.add("countdown-dots");

        for (let dotIdx = 5; dotIdx > 1; dotIdx--) {
            const tdDescending = document.createElement("td");
            tdDescending.setAttribute("data-countdown", String(dotIdx));
            tableCountdownDots.appendChild(tdDescending);
        }

        const tdOne = document.createElement("td");
        tdOne.setAttribute("data-countdown", "1");
        tableCountdownDots.appendChild(tdOne);

        for (let dotIdx = 2; dotIdx <= 5; dotIdx++) {
            const tdAscending = document.createElement("td");
            tdAscending.setAttribute("data-countdown", String(dotIdx));
            tableCountdownDots.appendChild(tdAscending);
        }

        divTeam.append(tableCountdownDots);

        const divMoney = this.div.presentation.money = document.createElement("div");
        divMoney.classList.add("team-money");
        divMoney.innerHTML = `$${this.money}`;
        divTeam.append(divMoney);

        const divName = this.div.presentation.teamName = document.createElement("div");
        divName.classList.add("team-name");
        divName.innerHTML = this.teamName;
        divTeam.append(divName);

        const progress = this.progressElementInPresentationWindow = document.createElement("progress");
        progress.style.display = "none";
        divTeam.append(progress);

        this.presentation.appendTeamDivToFooter(divTeam);

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

        const divState = this.div.operator.state = document.createElement("div");
        divState.classList.add("team-state");
        divState.innerHTML = this.state;
        divTeam.append(divState);

        const divMoney = this.div.operator.money = document.createElement("div");
        divMoney.classList.add("team-money");
        divMoney.innerHTML = `$${this.money}`;
        divTeam.append(divMoney);

        const progress = this.progressElementInOperatorWindow = document.createElement("progress");
        progress.style.display = "none";
        divTeam.append(progress);

        querySelectorAndCheck(document, "footer").prepend(divTeam);
    }


    public setState(targetState: TeamState, endLockout = false): void {
        // TODO talk about why the endLockout boolean is needed
        if (this.state === "lockout" && !endLockout) {
            this.stateBeforeLockout = targetState;
        } else {
            this.state = targetState;
            this.div.operator.wrapper?.setAttribute("data-team-state", targetState);
            this.div.presentation.wrapper?.setAttribute("data-team-state", targetState);

            if (this.div.operator.state) {
                this.div.operator.state.innerHTML = targetState;
            }

            if (this.countdownTimer) {
                this.countdownTimer.pause();
                this.countdownTimer = null;
            }
        }
    }

    public canBeLockedOut(): boolean {
        return this.state === "operator-is-reading-question";
    }

    public startLockout(): void {
        this.stateBeforeLockout = this.state;
        this.setState("lockout");

        const countdownShowCategory = this.countdownTimer = new CountdownTimer(this.settings.durationLockoutMillisec);
        if (this.progressElementInPresentationWindow) {
            countdownShowCategory.addProgressElement(this.progressElementInPresentationWindow);
            this.progressElementInPresentationWindow.style.display = ""; //show it by removing "display=none"
        }
        countdownShowCategory.onFinished = (): void => this.endLockout();
        countdownShowCategory.start();

    }

    public endLockout(): void {
        if (this.progressElementInPresentationWindow) {
            this.progressElementInPresentationWindow.style.display = "none";
        }
        if (this.stateBeforeLockout) {
            this.setState(this.stateBeforeLockout, true);
        }
        this.stateBeforeLockout = null;
        this.countdownTimer = null;
    }

    public startAnswer(): void {
        this.setState("answering");

        if (this.progressElementInOperatorWindow) {
            this.progressElementInOperatorWindow.style.display = ""; //show it by removing "display=none"
        }
    }

    public stopAnswer(): void {
        this.countdownDotsInPresentationWindow?.querySelectorAll("td").forEach(td => td.classList.remove("active"));
        if (this.progressElementInOperatorWindow) {
            this.progressElementInOperatorWindow.style.display = "none";
        }

        const timer = this.operator.getStateMachine()?.getCountdownTimerForState("waitForTeamAnswer");

        if (this.countdownDotsInPresentationWindow) {
            timer?.removeDotsTable(this.countdownDotsInPresentationWindow);
        }
        if (this.progressElementInOperatorWindow) {
            timer?.removeProgressElement(this.progressElementInOperatorWindow);
        }
    }

    public showKeyDown(): void {
        this.div.presentation.buzzerShow?.classList.add("pressed");
        this.div.presentation.buzzerShow?.classList.remove("not-pressed");
    }

    public showKeyUp(): void {
        this.div.presentation.buzzerShow?.classList.add("not-pressed");
        this.div.presentation.buzzerShow?.classList.remove("pressed");
    }

    public getCountdownDotsInPresentationWindow(): HTMLTableElement | undefined {
        return this.countdownDotsInPresentationWindow;
    }

    public getProgressElementInOperatorWindow(): HTMLProgressElement | undefined {
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

    public getTeamIndex(): number {
        return this.teamIdx;
    }


}
