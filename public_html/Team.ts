import { Presentation } from "./presentation/Presentation.js";
import { Settings } from "./Settings.js";
import { AudioManager } from "./operator/AudioManager.js";
import { Clue } from "./interfaces.js";
import { CountdownTimer } from "./CountdownTimer.js";


interface TeamDivs {
    operator: {
        wrapper: JQuery<HTMLDivElement>;
        dollars: JQuery<HTMLDivElement>;
        teamName: JQuery<HTMLDivElement>;
        state: JQuery<HTMLDivElement>;
    };
    presentation: {
        wrapper: JQuery<HTMLDivElement>;
        dollars: JQuery<HTMLDivElement>;
        teamName: JQuery<HTMLDivElement>;
        buzzerShow: JQuery<HTMLDivElement>;
    };
}

export class Team {
    settings: Settings;
    audioManager: AudioManager;
    teamIdx: number;
    dollars: number;
    teamName: string;
    state: TeamState;
    div: TeamDivs;
    presentationCountdownDots: JQuery<HTMLTableElement>;
    presentationProgressLockout: JQuery<HTMLProgressElement>;
    countdownTimer: CountdownTimer;
    stateBeforeLockout: TeamState;
    presentationInstance: Presentation;

    constructor(teamIdx: number, presentationInstance: Presentation, settings: Settings, audioManager: AudioManager) {
        this.settings = settings;
        this.audioManager = audioManager;
        this.teamIdx = teamIdx;
        this.dollars = 0;
        this.presentationInstance = presentationInstance;
        this.teamName = `Team ${teamIdx + 1}`;

        this.state = null;

        this.div = {
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

        /*
         this.statistics = {
         answerRight: 0,
         answerWrong:0,
         answerTimeout: 0,
         buzzTooEarly: 0
         };
         */

        this.presentationCountdownDots = null;
        this.presentationProgressLockout = null;
        this.countdownTimer = null;

        this.createDivsOperator();
        this.createDivsPresentation();
        this.initTeamNameListener();

        this.setState(TeamState.BUZZERS_OFF);
    }

    private initTeamNameListener() {
        const teamNameInput: JQuery<HTMLInputElement> = $("input#team-name-" + this.teamIdx);
        teamNameInput.on("input", (elem) => {
            this.setTeamName(elem.target.value);
        });
    }

    public handleAnswerCorrect(clueObj: Clue): void {
        this.audioManager.play("answerCorrect");
        this.moneyAdd(clueObj.value);
        this.presentationCountdownDots.find("td").removeClass("active");
    }

    public handleAnswerIncorrectOrAnswerTimeout(clueObj: Clue): void {
        this.audioManager.play("answerIncorrectOrAnswerTimeout");
        // todo set class on the <table> instead of finding <td>s
        this.presentationCountdownDots.find("td").removeClass("active");
        this.moneySubtract(clueObj.value * this.settings.wrongAnswerPenaltyMultiplier);
        this.setState(this.settings.allowMultipleAnswersToSameQuestion ? TeamState.CAN_ANSWER : TeamState.ALREADY_ANSWERED);
    }

    public moneyAdd(amountAdd: number): void {
        this._animateDollarsChange(this.dollars + amountAdd);
    }

    public moneySubtract(amountSubtract: number): void {
        this._animateDollarsChange(this.dollars - amountSubtract);
    }

    public moneySet(newDollars: number): void {
        this._animateDollarsChange(newDollars);
    }

    private _animateDollarsChange(targetDollars: number): void {

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

            instance._updateDollarsDisplay();
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

    private _updateDollarsDisplay(): void {
        this.div.presentation.dollars.html("$" + this.dollars.toLocaleString());
        this.div.operator.dollars.html("$" + this.dollars.toLocaleString());
    }

    private createDivsPresentation(): void {
        const divTeam = this.div.presentation.wrapper = $<HTMLDivElement>("<div>")
            .addClass("team")
            .attr("data-team-index", this.teamIdx)
            .attr("data-team-state", "");

        const divBuzzerDisplay = this.div.presentation.buzzerShow = $<HTMLDivElement>("<div>").addClass("buzzer-show").addClass("not-pressed");

        const imgSwitchClosed = $("<img>")
            .attr("src", "img/switch-closed.svg")
            .attr("attr", "switch closed")
            .addClass("buzzer-pressed");

        const imgSwitchOpened = $("<img>")
            .attr("src", "img/switch-opened.svg")
            .attr("attr", "switch opened")
            .addClass("buzzer-not-pressed");

        divBuzzerDisplay.append(imgSwitchClosed);
        divBuzzerDisplay.append(imgSwitchOpened);
        divTeam.append(divBuzzerDisplay);

        const tableCountdownDots = this.presentationCountdownDots = $<HTMLTableElement>("<table>").addClass("countdown-dots");

        for (let i = 5; i > 1; i--) {
            tableCountdownDots.append($("<td>").attr("data-countdown", i));
        }
        tableCountdownDots.append($("<td>").attr("data-countdown", 1));
        for (let i = 2; i <= 5; i++) {
            tableCountdownDots.append($("<td>").attr("data-countdown", i));
        }

        divTeam.append(tableCountdownDots);

        const divDollars = this.div.presentation.dollars = $<HTMLDivElement>("<div>").addClass("team-dollars").html("$" + this.dollars);
        divTeam.append(divDollars);

        const divName = this.div.presentation.teamName = $<HTMLDivElement>("<div>").addClass("team-name").html(this.teamName);
        divTeam.append(divName);

        const progress = this.presentationProgressLockout = $<HTMLProgressElement>("<progress>");
        divTeam.append(progress);

        this.presentationInstance.footerTeams.append(divTeam);




    }

    private createDivsOperator(): void {
        const divTeam = this.div.operator.wrapper = $<HTMLDivElement>("<div>")
            .addClass("team")
            .attr("data-team-index", this.teamIdx)
            .attr("data-team-state", "");

        const divName = this.div.operator.teamName = $<HTMLDivElement>("<div>").addClass("team-name").html(this.teamName);
        divTeam.append(divName);

        const divDollars = this.div.operator.dollars = $<HTMLDivElement>("<div>").addClass("team-dollars").html("$" + this.dollars);
        divTeam.append(divDollars);

        const divState = this.div.operator.state = $<HTMLDivElement>("<div>").addClass("team-state").html(this.state);
        divTeam.append(divState);

        divTeam.append($("<progress>").addClass("time-left").css("display:none"));

        $("footer").append(divTeam);

    }

    public setTeamName(teamName: string): void {
        // todo delete the entire mechanism to rename teams
        this.teamName = teamName;
        this.div.operator.teamName.html(teamName);
        this.div.presentation.teamName.html(teamName);
    }

    public setState(targetState: TeamState, endLockout = false): void {
        // TODO talk about why the endLockout boolean is needed
        if (this.state === TeamState.LOCKOUT && !endLockout) {
            this.stateBeforeLockout = targetState;
        } else {
            this.state = targetState;
            this.div.operator.wrapper.attr("data-team-state", targetState);
            this.div.presentation.wrapper.attr("data-team-state", targetState);
            this.div.operator.state.html(this.state);

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

        const countdownShowCategory = this.countdownTimer = new CountdownTimer(this.settings.durationLockout);
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
        this.presentationCountdownDots.find("td").addClass("active");
    }

    public showKeyDown(): void {
        this.div.presentation.buzzerShow.addClass("pressed").removeClass("not-pressed");
    }

    public showKeyUp(): void {
        this.div.presentation.buzzerShow.addClass("not-pressed").removeClass("pressed");
    }

    public jsonDump(): TeamDumpToJson {
        return {
            name: this.teamName,
            dollars: this.dollars
        };
    }

    public jsonLoad(jsonObj: TeamDumpToJson): void {
        this.teamName = jsonObj.name;
        this.dollars = jsonObj.dollars;

        this.div.presentation.dollars.html("$" + this.dollars);
        this.div.presentation.teamName.html(this.teamName);

        this.div.operator.teamName.html(this.teamName);
        this.div.operator.dollars.html("$" + this.dollars);
    }

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

