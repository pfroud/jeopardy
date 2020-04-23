import { Operator } from "../operator/Operator.js";
import { Settings } from "../Settings.js";
import { AudioManager } from "../operator/AudioManager.js";
import { Presentation } from "../presentation/Presentation.js";
import { CountdownTimer } from "../CountdownTimer.js";
import { getStates } from "./states.js";
import { StateMachineState, StateMachineTransition, KeyboardTransition, TimeoutTransition, TransitionType } from "./stateInterfaces.js";
import { generateGraphvizImpl } from "./generateGraphviz.js";

interface StateMap {
    [stateName: string]: StateMachineState;
}

interface ManualTriggerMap {
    [transitionname: string]: StateMachineTransition;
}

interface KeyboardKeysUsed {
    [keyboardKey: string]: number;
}

export class StateMachine {
    private readonly DEBUG: boolean;
    public readonly operator: Operator;
    public readonly settings: Settings;
    private readonly audioManager: AudioManager;
    private readonly presentation: Presentation;
    private readonly countdownProgress: JQuery<HTMLProgressElement>;
    private readonly countdownText: JQuery<HTMLDivElement>;
    private readonly divStateName: JQuery<HTMLDivElement>;
    private readonly stateMap: StateMap;
    private manualTriggerMap: ManualTriggerMap;
    public remainingQuestionTimeMs: number;
    private countdownTimer: CountdownTimer;
    private currentState: StateMachineState;
    private allStates: StateMachineState[];

    constructor(settings: Settings, operator: Operator, presentation: Presentation, audioManager: AudioManager) {

        this.DEBUG = false;

        this.operator = operator;
        this.presentation = presentation;
        this.settings = settings;
        this.audioManager = audioManager;

        this.countdownProgress = $("div#state-machine-viz progress#countdown");
        this.countdownText = $("div#state-machine-viz div#remaining");
        this.divStateName = $("div#state-machine-viz div#state-name");

        this.stateMap = {};
        this.manualTriggerMap = {};

        this.remainingQuestionTimeMs = -1;

        window.addEventListener("keydown", keyboardEvent => this._handleKeyboardEvent(keyboardEvent));

        this.countdownTimer = null;

        this.currentState = undefined;

        this.allStates = getStates(this, operator, settings);
        this._parseStates();

        this.currentState = this.allStates[0]; //idle state

    }

    private _handleKeyboardEvent(keyboardEvent: KeyboardEvent): void {
        if (document.activeElement.tagName === "INPUT") {
            return;
        }

        if (this.currentState && !this.operator.isPaused) {
            const transitionArray: StateMachineTransition[] = this.currentState.transitions;

            for (let i = 0; i < transitionArray.length; i++) {

                const transitionObj: StateMachineTransition = transitionArray[i];

                if (transitionObj.type === TransitionType.Keyboard && transitionObj.keys.includes(keyboardEvent.key)) {
                    /*
                    const hasCondition = Boolean(transitionObj.condition);
                    if (hasCondition) {
                        if (transitionObj.condition.call(this.operator, keyboardEvent)) {
                            this.goToState(transitionObj.dest, keyboardEvent);
                        }

                    } else {
                        */
                    this.goToState(transitionObj.dest, keyboardEvent);
                    // }

                    break;
                }
            }
        }
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

    private _startCountdown(transitionObj: TimeoutTransition, keyboardEvent: KeyboardEvent): void {
        let durationMs;
        let setMax = false;
        if (transitionObj.duration instanceof Function) {
            durationMs = transitionObj.duration();
            setMax = true;
        } else {
            durationMs = transitionObj.duration;
        }


        const destinationStateName = transitionObj.dest;

        const countdownTimer = this.countdownTimer = new CountdownTimer(durationMs, this.audioManager);
        countdownTimer.progressElements.push(this.countdownProgress);
        countdownTimer.textElements.push(this.countdownText);

        if (transitionObj.countdownTimerShowDots) {
            const teamIndex = Number(keyboardEvent.key) - 1;
            const teamObj = this.operator.teamArray[teamIndex];
            countdownTimer.dotsElement = teamObj.presentationCountdownDots;
        } else {
            countdownTimer.progressElements.push(this.presentation.getProgressElement());
        }

        if (setMax) {
            const newMax = this.settings.timeoutWaitForBuzzesMs;
            countdownTimer.maxMs = newMax;
            countdownTimer.progressElements.forEach(elem => elem.attr("max", newMax));
        }

        countdownTimer.onFinished = () => this.goToState(destinationStateName);
        countdownTimer.start();
    }

    public saveRemainingTime(): void {
        if (this.countdownTimer) {
            this.remainingQuestionTimeMs = this.countdownTimer.remainingMs;
        }
    }

    public manualTrigger(triggerName: string): void {

        // This is wrong, it will go to the destination state no matter what
        // todo change this to:
        // if the current state has a manual trigger matching the triggerName, then run the trigger
        if (triggerName in this.manualTriggerMap) {
            const transitionObj = this.manualTriggerMap[triggerName];
            if (transitionObj.type !== TransitionType.If) {
                // TODO this is a hack - remove after re-writing manualTrigger method
                this.goToState(transitionObj.dest);
            }
        } else {
            console.warn(`manual trigger failed: trigger "${triggerName}" not in map of known triggers`);
        }

    }

    public goToState(stateName: string, triggereringkeyboardEvent?: KeyboardEvent): void {

        if (!(stateName in this.stateMap)) {
            throw new RangeError(`can't go to state named "${stateName}", state not found`);
        }

        if (this.countdownTimer) {
            this.countdownTimer.pause();
            //            this.countdownTimer = null;
        }

        if (this.DEBUG) {
            console.log(`going to state "${stateName}"`);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        const handleOnExit = () => {
            if (this.currentState.onExit) {
                const functionToCall = this.currentState.onExit;
                if (!(functionToCall instanceof Function)) {
                    console.info(`state "${this.currentState.name}": cannot call onExit function "${functionToCall}", not a function`);
                    return;
                }
                functionToCall.call(this); //todo fix this, because onEnter always is an operatorInstance call
            }
        }

        const handleTransitionIf = () => {
            const transitionArray = this.currentState.transitions;
            for (let i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === TransitionType.If) {
                    if (transitionObj.condition.call(this.operator, triggereringkeyboardEvent)) {
                        this.goToState(transitionObj.then, triggereringkeyboardEvent);
                    } else {
                        this.goToState(transitionObj.else, triggereringkeyboardEvent);
                    }
                }
                break;
            }
        }

        const handleShowSlide = () => {
            if (this.currentState.showSlide) {
                if (this.presentation.slideNames.includes(this.currentState.showSlide)) {
                    this.presentation.showSlide(this.currentState.showSlide);
                } else {
                    console.warn(`entering state "${this.currentState.name}": can't show slide "${this.currentState.showSlide}", slide not found`);
                }
            }
        }

        const handleOnEnter = () => {
            if (this.currentState.onEnter) {

                const functionToCall = this.currentState.onEnter;

                //todo don't use global reference to operator instnace!
                //todo make this not suck, because onExit call is not an operatorInstance call
                const rv = functionToCall.call(this.operator, triggereringkeyboardEvent);

                if (rv && rv.constructor.name === "Promise") {

                    const transitionArray = this.currentState.transitions;
                    for (let i = 0; i < transitionArray.length; i++) {
                        const transitionObj = transitionArray[i];

                        if (transitionObj.type === TransitionType.Promise) {
                            rv.then(
                                () => this.goToState(transitionObj.dest)
                            ).catch(
                                (rv: any) => {
                                    console.warn("promise rejected:");
                                    throw rv;
                                }
                            );
                            break;
                        }
                    }




                }
            }
        }

        //todo rename this startCountdownTimer
        const handleTransitionTimeout = (triggeringKeyboardEvent: KeyboardEvent) => {
            const transitionArray = this.currentState.transitions;
            for (let i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === TransitionType.Timeout) {
                    this._startCountdown(transitionObj, triggeringKeyboardEvent);
                    this.divStateName.html(stateName + " &rarr; " + transitionObj.dest);
                    break;
                }
            }
        }

        const handleTransitionImmedaite = () => {
            const transitionArray = this.currentState.transitions;
            for (let i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === TransitionType.Immediate) {
                    this.goToState(transitionObj.dest);
                    break;
                }
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////////

        handleOnExit.call(this);

        this.currentState = this.stateMap[stateName];
        this.divStateName.html(stateName);

        handleShowSlide.call(this);
        handleOnEnter.call(this);
        handleTransitionTimeout.call(this, triggereringkeyboardEvent);
        handleTransitionImmedaite.call(this);
        handleTransitionIf.call(this);


    }

    private _parseStates(): void {

        // pass one of two
        this.allStates.forEach((stateObj: StateMachineState, index: number) => {
            this.stateMap[stateObj.name] = stateObj;

            if (stateObj.showSlide &&
                !this.presentation.slideNames.includes(stateObj.showSlide)) {
                console.warn(`state "${stateObj.name}": showSlide: unknown slide "${stateObj.showSlide}"`);
            }

        }, this);

        // pass two of two
        this.allStates.forEach((stateObj: StateMachineState, stateIndex: number) => {

            let keyboardKeysUsed: KeyboardKeysUsed = {};

            stateObj.transitions.forEach((transitionObj: StateMachineTransition, transitionIndex: number) => {

                if (transitionObj.type !== TransitionType.If) {
                    if (!transitionObj.dest) {
                        printWarning(stateObj.name, transitionIndex,
                            "no destination state");
                        return;
                    }
                    if (!(transitionObj.dest in this.stateMap)) {
                        printWarning(stateObj.name, transitionIndex,
                            `unknown destination state "${transitionObj.dest}"`);
                    }
                }

                switch (transitionObj.type) {
                    case TransitionType.Timeout:
                        const duration = transitionObj.duration;
                        if (!transitionObj.duration) {
                            printWarning(stateObj.name, transitionIndex,
                                "timeout has no duration property");
                        }
                        //                        if (!Number.isInteger(duration)) {
                        //                            printWarning(stateObj.name, transitionIndex,
                        //                                    `duration for timeout transition is not an integer: ${duration}`);
                        //                        }
                        break;

                    case TransitionType.Keyboard:
                        const keyboardKeys = transitionObj.keys;
                        if (!keyboardKeys) {
                            printWarning(stateObj.name, transitionIndex,
                                `no keys for keyboard transition`);
                        }

                        if (keyboardKeys.constructor.name !== "String") {
                            printWarning(stateObj.name, transitionIndex,
                                `property keys has type ${keyboardKeys.constructor.name}, expected String`);
                        }

                        // make sure each keyboard key is not used in multiple transitions
                        for (let i = 0; i < keyboardKeys.length; i++) {
                            const key = keyboardKeys.charAt(i);
                            if (key in keyboardKeysUsed) {
                                printWarning(stateObj.name, transitionIndex,
                                    `keyboard key "${key}" already used in transition ${keyboardKeysUsed[key]}`);
                            } else {
                                keyboardKeysUsed[key] = transitionIndex;
                            }
                        }

                        break;

                    case TransitionType.Manual:
                        this.manualTriggerMap[transitionObj.name] = transitionObj;
                        break;

                    case TransitionType.Promise:
                    case TransitionType.Immediate:
                        // no further validation needed
                        break;

                    case TransitionType.If:
                        if (!(transitionObj.condition instanceof Function)) {
                            printWarning(stateObj.name, transitionIndex,
                                "condition is not a function: " + transitionObj.condition);
                        }
                        if (!(transitionObj.then in this.stateMap)) {
                            printWarning(stateObj.name, transitionIndex,
                                `unknown 'then' state "${transitionObj.then}"`);
                        }
                        if (!(transitionObj.else in this.stateMap)) {
                            printWarning(stateObj.name, transitionIndex,
                                `unknown 'else' state "${transitionObj.else}"`);
                        }
                        break;

                    default:
                        printWarning(stateObj.name, transitionIndex,
                            `unknown transition type!`);
                        break;
                }

                function printWarning(stateName: string, transitionIndex: number, message: string) {
                    console.warn(`state "${stateName}": transition ${transitionIndex}: ${message}`);
                }

            }, this);

        }, this);

    }

    public graphviz(): void {
        generateGraphvizImpl(this.allStates);
    }

}
