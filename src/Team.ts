import { AudioManager } from "./AudioManager";
import { CountdownTimer } from "./CountdownTimer";
import { Settings } from "./Settings";
import { querySelectorAndCheck } from "./commonFunctions";
import { FullClue } from "./gameTypes";
import { Operator } from "./operator/Operator";
import { Presentation } from "./presentation/Presentation";

interface Statistics {
    questionsNotBuzzed: number;
    questionsBuzzedThenAnsweredRight: number;
    questionsBuzzedThenAnsweredWrongOrTimedOut: number;
    moneyAtEndOfEachRound: number[]
}

export type TeamState =
    "idle" | // the question has not been presented to the players yet
    "operator-is-reading-question" | //pressing the buzzer in this state will result in lockout
    "can-answer" | //operator is done reading the question
    "answering" |
    "already-answered-this-clue" |
    "lockout" | //team buzzed while operator was reading the question
    "other-team-is-answering"
    ;

export interface TeamSavedInLocalStorage {
    readonly MONEY: number;
    readonly TEAM_NAME: string;
    readonly STATISTICS: Statistics;
}

export class Team {
    private teamName: string;

    private money = 0;
    private countdownDotsInPresentationWindow?: HTMLTableElement;
    private readonly SETTINGS: Settings;
    private readonly AUDIO_MANAGER: AudioManager;
    private readonly PRESENTATION: Presentation;
    private readonly OPERATOR: Operator;
    private readonly TEAM_INDEX: number;
    /** One countdown timer used to keep track of all timing for this Team */
    private countdownTimer?: CountdownTimer | null;
    private state: TeamState;
    private stateBeforeLockout?: TeamState | null;
    private progressElementInPresentationWindow?: HTMLProgressElement;
    private progressElementInOperatorWindow?: HTMLProgressElement;
    private allCountdownDots?: NodeListOf<HTMLTableCellElement>;
    private readonly DIV: {
        readonly OPERATOR: {
            wrapper: HTMLDivElement | null;
            money: HTMLDivElement | null;
            teamName: HTMLDivElement | null;
            state: HTMLDivElement | null;
        };
        readonly PRESENTATION: {
            wrapper: HTMLDivElement | null;
            money: HTMLDivElement | null;
            teamName: HTMLDivElement | null;
            buzzerShow: HTMLDivElement | null;
        };
    } = {
            OPERATOR: {
                wrapper: null,
                money: null,
                teamName: null,
                state: null
            },
            PRESENTATION: {
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
        this.SETTINGS = settings;
        this.AUDIO_MANAGER = audioManager;
        this.TEAM_INDEX = teamIdx;
        this.PRESENTATION = presentation;
        this.OPERATOR = operator;

        const teamNumber = teamIdx + 1;
        this.teamName = `Team ${teamNumber}`;

        this.createElementsInOperatorWindow();
        this.createElementsInPresentationWindow();

        // suppress TS2564 "property has no initializer and is not assigned in the constructor"
        this.state = "idle";
        this.setState("idle");
    }

    public handleAnswerCorrect(clue: FullClue): void {
        this.stopAnswer();
        this.AUDIO_MANAGER.ANSWER_CORRECT.play();
        this.moneyAdd(clue.VALUE);
        this.statistics.questionsBuzzedThenAnsweredRight++;
        this.hasBuzzedForCurrentQuestion = true;
    }

    public handleAnswerIncorrectOrAnswerTimeout(clue: FullClue): void {
        this.stopAnswer();
        this.AUDIO_MANAGER.ANSWER_WRONG_OR_ANSWER_TIMEOUT.play();
        this.moneySubtract(clue.VALUE * this.SETTINGS.wrongAnswerPenaltyMultiplier);
        this.setState(this.SETTINGS.allowMultipleAnswersToSameQuestion ? "can-answer" : "already-answered-this-clue");
        this.statistics.questionsBuzzedThenAnsweredWrongOrTimedOut++;
        this.hasBuzzedForCurrentQuestion = true;
    }

    public moneyAdd(amountAdd: number, animate = true): void {
        if (animate) {
            this.animateMoneyChange(this.money + amountAdd);
        } else {
            this.money += amountAdd;
            this.setMoneyDisplay(this.money);
        }
    }

    public getTeamName(): string {
        return this.teamName;
    }

    public setTeamName(newName: string): void {
        this.teamName = newName;
        this.DIV.OPERATOR.teamName!.innerText = newName;
        this.DIV.PRESENTATION.teamName!.innerText = newName;
    }

    public moneySubtract(amountSubtract: number, animate = true): void {
        if (animate) {
            this.animateMoneyChange(this.money - amountSubtract);
        } else {
            this.money -= amountSubtract;
            this.setMoneyDisplay(this.money);
        }
    }

    public moneySet(newMoney: number, animate = true): void {
        if (animate) {
            this.animateMoneyChange(newMoney);
        } else {
            this.money = newMoney;
            this.setMoneyDisplay(this.money);
        }
    }

    private animateMoneyChange(targetMoney: number): void {
        if (this.money === targetMoney) {
            return;
        }

        let moneyDisplayedOnScreen = this.money;
        this.money = targetMoney;

        const DOLLAR_CHANGE_PER_STEP = 100;
        const DELAY_BETWEEN_STEPS_MILLISEC = 50;
        const DIRECTION_MULTIPLIER = (targetMoney > moneyDisplayedOnScreen) ? 1 : -1;

        const handleTimeout = (): void => {
            const difference = Math.abs(targetMoney - moneyDisplayedOnScreen);

            // teams could loose $50 if the guessing penalty is 0.5, for example
            if (difference >= DOLLAR_CHANGE_PER_STEP) {
                moneyDisplayedOnScreen += DIRECTION_MULTIPLIER * DOLLAR_CHANGE_PER_STEP;
            } else {
                moneyDisplayedOnScreen += DIRECTION_MULTIPLIER * difference;
            }

            this.setMoneyDisplay(moneyDisplayedOnScreen);
            if (moneyDisplayedOnScreen !== targetMoney) {
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

    private setMoneyDisplay(value: number): void {
        if (this.DIV.PRESENTATION.money) {
            this.DIV.PRESENTATION.money.innerHTML = `$${value.toLocaleString()}`;
        }
        if (this.DIV.OPERATOR.money) {
            this.DIV.OPERATOR.money.innerHTML = `$${value.toLocaleString()}`;
        }
    }

    private createElementsInPresentationWindow(): void {
        const divTeam = this.DIV.PRESENTATION.wrapper = document.createElement("div");
        divTeam.classList.add("team");
        divTeam.setAttribute("data-team-index", String(this.TEAM_INDEX));
        divTeam.setAttribute("data-team-state", "");

        const divBuzzerDisplay = this.DIV.PRESENTATION.buzzerShow = document.createElement("div");
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

        this.allCountdownDots = this.countdownDotsInPresentationWindow?.querySelectorAll("td");

        const divMoney = this.DIV.PRESENTATION.money = document.createElement("div");
        divMoney.classList.add("team-money");
        divMoney.innerHTML = `$${this.money}`;
        divTeam.append(divMoney);

        const divName = this.DIV.PRESENTATION.teamName = document.createElement("div");
        divName.classList.add("team-name");
        divName.innerHTML = this.teamName;
        divTeam.append(divName);

        const progress = this.progressElementInPresentationWindow = document.createElement("progress");
        progress.style.display = "none";
        divTeam.append(progress);

        this.PRESENTATION.appendTeamDivToFooter(divTeam);

    }

    private createElementsInOperatorWindow(): void {
        const divTeam = this.DIV.OPERATOR.wrapper = document.createElement("div");
        divTeam.classList.add("team");
        divTeam.setAttribute("data-team-index", String(this.TEAM_INDEX));
        divTeam.setAttribute("data-team-state", "");

        const divName = this.DIV.OPERATOR.teamName = document.createElement("div");
        divName.classList.add("team-name");
        divName.innerHTML = this.teamName;
        divTeam.append(divName);

        const divState = this.DIV.OPERATOR.state = document.createElement("div");
        divState.classList.add("team-state");
        divState.innerHTML = this.state;
        divTeam.append(divState);

        const divMoney = this.DIV.OPERATOR.money = document.createElement("div");
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
            this.DIV.OPERATOR.wrapper?.setAttribute("data-team-state", targetState);
            this.DIV.PRESENTATION.wrapper?.setAttribute("data-team-state", targetState);

            if (this.DIV.OPERATOR.state) {
                this.DIV.OPERATOR.state.innerHTML = targetState;
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

        const countdownShowCategory = this.countdownTimer = new CountdownTimer(this.SETTINGS.durationLockoutMillisec);
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
        this.allCountdownDots?.forEach(td => td.classList.remove("active"));
        if (this.progressElementInOperatorWindow) {
            this.progressElementInOperatorWindow.style.display = "none";
        }

        const timer = this.OPERATOR.getStateMachine()?.getCountdownTimerForState("waitForTeamAnswer");

        if (this.countdownDotsInPresentationWindow) {
            timer?.removeDotsTable(this.countdownDotsInPresentationWindow);
        }
        if (this.progressElementInOperatorWindow) {
            timer?.removeProgressElement(this.progressElementInOperatorWindow);
        }
    }

    public showKeyDown(): void {
        this.DIV.PRESENTATION.buzzerShow?.classList.add("pressed");
        this.DIV.PRESENTATION.buzzerShow?.classList.remove("not-pressed");
    }

    public showKeyUp(): void {
        this.DIV.PRESENTATION.buzzerShow?.classList.add("not-pressed");
        this.DIV.PRESENTATION.buzzerShow?.classList.remove("pressed");
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
            MONEY: this.money,
            TEAM_NAME: this.teamName,
            STATISTICS: this.statistics
        };
    }

    public loadFromLocalStorage(source: TeamSavedInLocalStorage): void {
        this.moneySet(source.MONEY, false);
        this.statistics = source.STATISTICS;
        this.setTeamName(source.TEAM_NAME);
    }

    public getTeamIndex(): number {
        return this.TEAM_INDEX;
    }


}
