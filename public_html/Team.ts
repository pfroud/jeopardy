import { Presentation } from "./presentation/Presentation";
import { Settings } from "./Settings";
import { AudioManager } from "./operator/AudioManager";
import { getStates } from "./stateMachine/states";
import { Clue } from "./interfaces";
import { CountdownTimer } from "./CountdownTimer";
import { StateMachineState } from "./stateMachine/stateInterfaces";


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

const ANIMATE_DOLLARS_CHANGE = true;
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
    hasAnswered: boolean;

    constructor(teamIdx: number, presentationInstance: Presentation, settings: Settings, audioManager: AudioManager) {
        this.settings = settings;
        this.audioManager = audioManager;
        this.teamIdx = teamIdx;
        this.dollars = 0;
        this.teamName = "team " + (teamIdx + 1);

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
                //                dollarChangeAnimation: null
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

        this.setDivOperator($('div[data-team-index="' + teamIdx + '"]'));
        this.setDivPresentation(presentationInstance.getTeamDiv(teamIdx));

        this.setState(TeamState.BUZZERS_OFF);
    }

    public handleAnswerRight(clueObj: Clue): void {
        this.audioManager.play("answerRight");
        this.moneyAdd(clueObj.value);
        this.presentationCountdownDots.find("td").removeClass("active");
    }

    public handleAnswerWrong(clueObj: Clue): void {
        this.audioManager.play("answerWrong");
        this.presentationCountdownDots.find("td").removeClass("active");
        this.moneySubtract(clueObj.value * this.settings.wrongAnswerPenaltyMultiplier);
        this.setState(this.settings.allowMultipleAnswersToSameQuestion ? TeamState.CAN_ANSWER : TeamState.ALREADY_ANSWERED);
    }

    public moneyAdd(amountAdd: number): void {
        if (ANIMATE_DOLLARS_CHANGE) {
            //            this._showFallingMoneyAnimation(amountAdd);
            this._animateDollarsChange(this.dollars + amountAdd);
        } else {
            this.dollars += amountAdd;
            this._updateDollarsDisplay();
        }
    }

    public moneySubtract(amountSubtract: number): void {
        if (ANIMATE_DOLLARS_CHANGE) {
            this._animateDollarsChange(this.dollars - amountSubtract);
        } else {
            this.dollars -= amountSubtract;
            this._updateDollarsDisplay();
        }
    }

    public moneySet(newDollars: number): void {
        if (ANIMATE_DOLLARS_CHANGE) {
            this._animateDollarsChange(newDollars);
        } else {
            this.dollars = newDollars;
            this._updateDollarsDisplay();
        }
    }

    /*
     _showFallingMoneyAnimation(amountAdd) {
     //absolutley insane way to reset CSS animation https://stackoverflow.com/a/45036752
     this.div.presentation.dollarChangeAnimation.css("animation", "none");
     void(this.div.presentation.dollarChangeAnimation.get(0).offsetHeight); // trigger CSS reflow
     this.div.presentation.dollarChangeAnimation.css("animation", null);

     this.div.presentation.dollarChangeAnimation
     .html("+$" + amountAdd.toLocaleString() + "&ensp;")
     .css("animation", "0.5s cubic-bezier(0.5, 0.5, 0.1, 1) 1 dollar-change-animation");
     }
     */

    private _animateDollarsChange(targetDollars: number): void {

        if (this.dollars === targetDollars) {
            return;
        }

        const DOLLAR_CHANGE_PER_STEP = 100;
        const DELAY_BETWEEN_STEPS_MS = 50;
        const DIRECTION_MULTIPLIER = targetDollars > this.dollars ? 1 : -1;

        setTimeout(handleTimeout, DELAY_BETWEEN_STEPS_MS, this);

        function handleTimeout(instance: Team) {
            instance.dollars += DIRECTION_MULTIPLIER * DOLLAR_CHANGE_PER_STEP;
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

    private setDivPresentation(divPresentationWrapper: JQuery<HTMLDivElement>): void {
        this.div.presentation.wrapper = divPresentationWrapper;
        this.div.presentation.dollars = divPresentationWrapper.find<HTMLDivElement>("div.team-dollars").html("$" + this.dollars);
        this.div.presentation.teamName = divPresentationWrapper.find<HTMLDivElement>("div.team-name").html(this.teamName);
        this.div.presentation.buzzerShow = divPresentationWrapper.find<HTMLDivElement>("div.buzzer-show");
        // this.div.presentation.dollarChangeAnimation = divPresentationWrapper.find<HTMLDivElement>("div.dollar-change-animation");

        this.presentationCountdownDots = divPresentationWrapper.find<HTMLTableElement>("table.countdown-dots");
        this.presentationProgressLockout = divPresentationWrapper.find("progress");
    }

    private setDivOperator(divOperatorWrapper: JQuery<HTMLDivElement>): void {
        this.div.operator.wrapper = divOperatorWrapper;
        this.div.operator.teamName = divOperatorWrapper.find<HTMLDivElement>("div.team-name").html(this.teamName);
        this.div.operator.dollars = divOperatorWrapper.find<HTMLDivElement>("div.team-dollars").html("$" + this.dollars);
        this.div.operator.state = divOperatorWrapper.find<HTMLDivElement>("div.team-state").html(this.state);
    }

    publicsetTeamName(teamName: string): void {
        this.teamName = teamName;
        this.div.operator.teamName.html(teamName);
        this.div.presentation.teamName.html(teamName);
    }

    public setState(targetState: TeamState, endLockout = false): void {
        /*
        if (!(Team.stateValues.includes(targetState))) {
            throw new RangeError(`team ${this.teamIdx}: can't go to state "${targetState}", not in the enum of avaliable states`);
        }
        */

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
        countdownShowCategory.intervalMs = 50; //high resolution mode!!
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
    ALREADY_ANSWERED = "already-answered",
    LOCKOUT = "lockout" //team buzzed while operator was reading the question
};

// Object.freeze(TeamState);
// Team.stateValues = Object.values(TeamState);
// Object.freeze(Team.stateValues);