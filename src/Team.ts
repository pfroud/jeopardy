import { AudioManager } from "./AudioManager";
import { BuzzTimingRecord } from "./BuzzTimingChart";
import { CountdownTimer } from "./CountdownTimer";
import { Settings } from "./Settings";
import { querySelectorAndCheck } from "./commonFunctions";
import { Operator } from "./operator/Operator";
import { Presentation } from "./presentation/Presentation";
import { RevealedClue } from "./typesForGame";

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
    // readonly STATISTICS: StatisticsForGameEndCharts;
}

export class Team {
    private teamName: string;

    private money = 0;
    private symmetricShrinkingSegmentedProgressBarTableInPresentationWindow?: HTMLTableElement;
    private readonly SETTINGS: Settings;
    private readonly AUDIO_MANAGER: AudioManager;
    private readonly PRESENTATION: Presentation;
    private readonly OPERATOR: Operator;
    private readonly TEAM_INDEX: number;
    /** One countdown timer used to keep track of all timing for this Team */
    private countdownTimer: CountdownTimer | null = null;
    private state: TeamState;
    private stateBeforeLockout: TeamState | null = null;
    private progressElementInPresentationWindow?: HTMLProgressElement;
    private progressElementInOperatorWindow?: HTMLProgressElement;

    private readonly SYMMETRIC_SHRINKING_SEGMENTED_PROGRESS_BAR_SEGMENTS = new Set<HTMLTableCellElement>;
    private readonly DIV: {
        readonly OPERATOR: {
            wrapper?: HTMLDivElement;
            money?: HTMLDivElement;
            teamName?: HTMLDivElement;
            state?: HTMLDivElement;
        };
        readonly PRESENTATION: {
            wrapper?: HTMLDivElement;
            money?: HTMLDivElement;
            teamName?: HTMLDivElement;
            buzzerShow?: HTMLDivElement;
        };
    } = {
            OPERATOR: {
            },
            PRESENTATION: {
            }
        };

    private hasBuzzedForCurrentQuestion_ = false;

    public moneyAtEndOfEachRound: number[] = [];

    /**
     * The first array is for each clue.
     * The second index is for how many times the team buzzes for that clue.
     * 
     * WATCH OUT because in BuzzTimingChart, the first array is the TEAM INDEX.
     * BuzzTimingChart does NOT keep track of multiple clues.
     * */
    public buzzTimingForAllClues: BuzzTimingRecord[][] = [];


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

    public onAnswerCorrect(clue: RevealedClue): void {
        this.answerStop();
        this.AUDIO_MANAGER.ANSWER_CORRECT.play();
        this.moneyAdd(clue.VALUE);
        this.hasBuzzedForCurrentQuestion_ = true;
    }

    public onAnswerIncorrectOrAnswerTimeout(clue: RevealedClue): void {
        this.answerStop();
        this.AUDIO_MANAGER.ANSWER_WRONG_OR_ANSWER_TIMEOUT.play();
        this.moneySubtract(clue.VALUE * this.SETTINGS.wrongAnswerPenaltyMultiplier);
        this.setState(this.SETTINGS.allowMultipleAnswersToSameQuestion ? "can-answer" : "already-answered-this-clue");
        this.hasBuzzedForCurrentQuestion_ = true;
    }

    public getTeamName(): string {
        return this.teamName;
    }

    public setTeamName(newName: string): void {
        this.teamName = newName;
        this.DIV.OPERATOR.teamName!.innerText = newName;
        this.DIV.PRESENTATION.teamName!.innerText = newName;
    }

    /** 
     * Animate it when a team interacts with a clue.
     * Do not animate it when using the money override tool.
     */
    public moneyAdd(amountAdd: number, animate = true): void {
        if (animate) {
            this.moneyAnimateChange(this.money + amountAdd);
        } else {
            this.money += amountAdd;
            this.moneySetDisplay(this.money);
        }
    }

    /** 
     * Animate it when a team interacts with a clue.
     * Do not animate it when using the money override tool.
     */
    public moneySubtract(amountSubtract: number, animate = true): void {
        if (animate) {
            this.moneyAnimateChange(this.money - amountSubtract);
        } else {
            this.money -= amountSubtract;
            this.moneySetDisplay(this.money);
        }
    }

    public moneySet(newMoney: number, animate = true): void {
        if (animate) {
            this.moneyAnimateChange(newMoney);
        } else {
            this.money = newMoney;
            this.moneySetDisplay(this.money);
        }
    }

    private moneyAnimateChange(targetMoney: number): void {
        if (this.money === targetMoney) {
            return;
        }

        // Immediately update the money property, but remember what it was before
        let moneyDisplayedOnScreen = this.money;
        this.money = targetMoney;

        const DOLLAR_CHANGE_PER_STEP = 100;
        const DELAY_BETWEEN_STEPS_MILLISEC = 50;
        const DIRECTION_MULTIPLIER = (targetMoney > moneyDisplayedOnScreen) ? 1 : -1;

        const onTimeout = (): void => {
            const difference = Math.abs(targetMoney - moneyDisplayedOnScreen);

            // teams could loose $50 if the guessing penalty is 0.5, for example
            if (difference >= DOLLAR_CHANGE_PER_STEP) {
                moneyDisplayedOnScreen += DIRECTION_MULTIPLIER * DOLLAR_CHANGE_PER_STEP;
            } else {
                moneyDisplayedOnScreen += DIRECTION_MULTIPLIER * difference;
            }

            this.moneySetDisplay(moneyDisplayedOnScreen);
            if (moneyDisplayedOnScreen !== targetMoney) {
                setTimeout(onTimeout, DELAY_BETWEEN_STEPS_MILLISEC, this);
            }

        };

        setTimeout(onTimeout, DELAY_BETWEEN_STEPS_MILLISEC);

    }

    private moneySetDisplay(value: number): void {
        if (this.DIV.PRESENTATION.money) {
            this.DIV.PRESENTATION.money.innerHTML = `$${value.toLocaleString()}`;
        }
        if (this.DIV.OPERATOR.money) {
            this.DIV.OPERATOR.money.innerHTML = `$${value.toLocaleString()}`;
        }
    }

    public canBuzz(): boolean {
        return this.state === "can-answer";
    }

    public setPaused(isPaused: boolean): void {
        this.countdownTimer?.setPaused(isPaused);
    }

    private createElementsInPresentationWindow(): void {
        const divTeam = this.DIV.PRESENTATION.wrapper = document.createElement("div");
        divTeam.classList.add("team");
        divTeam.setAttribute("data-team-index", String(this.TEAM_INDEX));
        divTeam.setAttribute("data-team-state", "");

        const divBuzzerSwitchStateDisplay = this.DIV.PRESENTATION.buzzerShow = document.createElement("div");
        divBuzzerSwitchStateDisplay.classList.add("buzzer-switch-state-display");
        divBuzzerSwitchStateDisplay.classList.add("not-pressed");

        // https://parceljs.org/languages/svg/#url-references
        const switchClosedSvg = new URL("./presentation/img/switch-closed.svg", import.meta.url);
        const switchOpenSvg = new URL("./presentation/img/switch-opened.svg", import.meta.url);

        const imgSwitchClosed = document.createElement("img");
        imgSwitchClosed.setAttribute("src", switchClosedSvg.toString());
        imgSwitchClosed.classList.add("buzzer-pressed");

        const imgSwitchOpened = document.createElement("img");
        imgSwitchOpened.setAttribute("src", switchOpenSvg.toString());
        imgSwitchOpened.classList.add("buzzer-not-pressed");

        divBuzzerSwitchStateDisplay.append(imgSwitchClosed);
        divBuzzerSwitchStateDisplay.append(imgSwitchOpened);
        divTeam.append(divBuzzerSwitchStateDisplay);

        /*
        In the TV show, there are nine light-up rectangles below each contestant which shows
        how much time is left to answer a question.
        Here's a video from the official Jeopardy Youtube channel where you can see how it works:
        https://www.youtube.com/watch?v=cGSDLZ5wqy8&t=10s
        */

        this.symmetricShrinkingSegmentedProgressBarTableInPresentationWindow = document.createElement("table");
        this.symmetricShrinkingSegmentedProgressBarTableInPresentationWindow.classList.add("symmetric-shrinking-segmented-progress-bar");

        const tr = document.createElement("tr");

        const maxTimeSeconds = this.SETTINGS.timeoutWaitForAnswerMillisec / 1000;

        /*
        The table cells we want to make:
        ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
        │ 5 │ 4 │ 3 │ 2 │ 1 │ 2 │ 3 │ 4 │ 5 │
        └───┴───┴───┴───┴───┴───┴───┴───┴───┘
        */

        // create segments maxTimeSeconds, ..., 3, 2, 1
        for (let i = maxTimeSeconds; i > 0; i--) {
            const td = document.createElement("td");
            this.SYMMETRIC_SHRINKING_SEGMENTED_PROGRESS_BAR_SEGMENTS.add(td);
            td.setAttribute(CountdownTimer.ATTRIBUTE_NAME_SYMMETRIC_SHRINKING_SEGMENTED_PROGRESS_BAR_TIME_REMAINING_SECONDS, String(i));
            tr.append(td);
        }

        // create segments 2, 3, 4, ..., maxTimeSeconds
        for (let i = 2; i <= maxTimeSeconds; i++) {
            const td = document.createElement("td");
            this.SYMMETRIC_SHRINKING_SEGMENTED_PROGRESS_BAR_SEGMENTS.add(td);
            td.setAttribute(CountdownTimer.ATTRIBUTE_NAME_SYMMETRIC_SHRINKING_SEGMENTED_PROGRESS_BAR_TIME_REMAINING_SECONDS, String(i));
            tr.append(td);
        }

        this.symmetricShrinkingSegmentedProgressBarTableInPresentationWindow.append(tr);
        divTeam.append(this.symmetricShrinkingSegmentedProgressBarTableInPresentationWindow);

        const divMoney = this.DIV.PRESENTATION.money = document.createElement("div");
        divMoney.classList.add("team-money");
        divMoney.innerHTML = `$${this.money}`;
        divTeam.append(divMoney);

        const divName = this.DIV.PRESENTATION.teamName = document.createElement("div");
        divName.classList.add("team-name");
        divName.innerHTML = this.teamName;
        divTeam.append(divName);

        this.progressElementInPresentationWindow = document.createElement("progress");
        divTeam.append(this.progressElementInPresentationWindow);

        this.PRESENTATION.footerAppendTeamDiv(this.TEAM_INDEX, divTeam);

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

        this.progressElementInOperatorWindow = document.createElement("progress");
        divTeam.append(this.progressElementInOperatorWindow);

        querySelectorAndCheck(document, "footer").prepend(divTeam);
    }


    public setState(targetState: TeamState, endLockout = false): void {
        // TODO write documentation about why the endLockout boolean is needed
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

    public lockoutStart(): void {
        this.stateBeforeLockout = this.state;
        this.setState("lockout");

        const countdownShowCategory = this.countdownTimer = new CountdownTimer(this.SETTINGS.durationLockoutMillisec);
        if (this.progressElementInPresentationWindow) {
            countdownShowCategory.addProgressElement(this.progressElementInPresentationWindow);
        }
        countdownShowCategory.onFinished = (): void => this.lockoutStop();
        countdownShowCategory.start();

        /*
        How does a Team know what the clue index is?

        Actually this is a bad way to do it, because we would need to check if it's the first 
        time adding a record for the present clue index to either create the array or
        push to the array.

        So I guess we have a buzzRecordsForPresentClue in Team (which I think was
        already in Operator). Then the Team needs to know about questions incrementing.

        */

    }

    public lockoutStop(): void {
        if (this.stateBeforeLockout) {
            this.setState(this.stateBeforeLockout, true);
        }
        this.stateBeforeLockout = null;
        this.countdownTimer = null;
    }

    public answerStart(): void {
        this.setState("answering");
    }

    public answerStop(): void {
        this.SYMMETRIC_SHRINKING_SEGMENTED_PROGRESS_BAR_SEGMENTS.forEach(td => td.classList.remove("active"));

        const timer = this.OPERATOR.getStateMachine()?.getCountdownTimerForState("waitForTeamAnswer");

        if (this.symmetricShrinkingSegmentedProgressBarTableInPresentationWindow) {
            timer?.removeSymmetricShrinkingSegmentedProgressBarTable(this.symmetricShrinkingSegmentedProgressBarTableInPresentationWindow);
        }
        if (this.progressElementInOperatorWindow) {
            timer?.removeProgressElement(this.progressElementInOperatorWindow);
        }
    }

    public showKeyboardKeyDown(): void {
        this.DIV.PRESENTATION.buzzerShow?.classList.add("pressed");
        this.DIV.PRESENTATION.buzzerShow?.classList.remove("not-pressed");
    }

    public showKeyboardKeyUp(): void {
        this.DIV.PRESENTATION.buzzerShow?.classList.add("not-pressed");
        this.DIV.PRESENTATION.buzzerShow?.classList.remove("pressed");
    }

    public getSymmetricShrinkingSegmentedProgressBarTableInPresentationWindow(): HTMLTableElement | undefined {
        return this.symmetricShrinkingSegmentedProgressBarTableInPresentationWindow;
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

    public statisticsUpdateMoneyAtEndOfRound(): void {
        this.moneyAtEndOfEachRound.push(this.money);
    }

    /*
    public getObjectToSaveInLocalStorage(): TeamSavedInLocalStorage {
        return {
            MONEY: this.money,
            TEAM_NAME: this.teamName,
            STATISTICS: this.statisticsForGameEndCharts
        };
    }

    public loadFromLocalStorage(source: TeamSavedInLocalStorage): void {
        this.moneySet(source.MONEY, false);
        this.statisticsForGameEndCharts = source.STATISTICS;
        this.setTeamName(source.TEAM_NAME);
    }
        */

    public getTeamIndex(): number {
        return this.TEAM_INDEX;
    }

    public choosingClueSet(): void {
        this.DIV.OPERATOR.wrapper?.classList.add("choose-clue");
        this.DIV.PRESENTATION.wrapper?.classList.add("choose-clue");
    }

    public choosingClueClear(): void {
        this.DIV.OPERATOR.wrapper?.classList.remove("choose-clue");
        this.DIV.PRESENTATION.wrapper?.classList.remove("choose-clue");
    }

    public hasBuzzedForCurrentQuestion(): boolean {
        return this.hasBuzzedForCurrentQuestion_;
    }

    public resetHasBuzzedForCurrentQuestion(): void {
        this.hasBuzzedForCurrentQuestion_ = false;
    }

    /*
    public getStatistics(): StatisticsForGameEndCharts {
        return this.statisticsForGameEndCharts;
    }
        */



}
