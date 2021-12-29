import { Operator } from "../operator/Operator.js";
import { Settings } from "../Settings.js";
import { AudioManager } from "../operator/AudioManager.js";
import { Presentation } from "../presentation/Presentation.js";
import { CountdownTimer } from "../CountdownTimer.js";
import { getStatesForJeopardyGame } from "./statesForJeopardyGame.js";
import { StateMachineState, StateMachineTransition, KeyboardTransition, TimeoutTransition, TransitionType } from "./stateInterfaces.js";
import { generateGraphvizImpl } from "./generateGraphviz.js";
import { GraphvizViewer } from "../graphvizViewer/graphvizViewer.js";

interface StateMap {
    [stateName: string]: StateMachineState;
}

interface ManualTriggerMap {
    [transitionName: string]: StateMachineTransition;
}

interface KeyboardKeysUsed {
    [keyboardKey: string]: number;
}

export class StateMachine {
    private readonly DEBUG = true;
    public readonly operator: Operator;
    public readonly settings: Settings;
    private readonly audioManager: AudioManager;
    private readonly presentation: Presentation;
    private readonly operatorWindowCountdownProgress: JQuery<HTMLProgressElement>;
    private readonly operatorWindowCountdownText: JQuery<HTMLDivElement>;
    private readonly operatorWindowDivStateName: JQuery<HTMLDivElement>;
    private readonly stateMap: StateMap;
    private graphvizViewer: GraphvizViewer;
    private manualTriggerMap: ManualTriggerMap;
    public remainingQuestionTimeMs: number;
    private countdownTimer: CountdownTimer;
    private presentState: StateMachineState;
    private allStates: StateMachineState[];

    constructor(settings: Settings, operator: Operator, presentation: Presentation, audioManager: AudioManager) {


        this.operator = operator;
        this.presentation = presentation;
        this.settings = settings;
        this.audioManager = audioManager;

        this.operatorWindowCountdownProgress = $("div#state-machine-viz progress#countdown");
        this.operatorWindowCountdownText = $("div#state-machine-viz div#remaining");
        this.operatorWindowDivStateName = $("div#state-machine-viz div#state-name");

        this.stateMap = {};
        this.manualTriggerMap = {};

        this.remainingQuestionTimeMs = -1;

        window.addEventListener("keydown", keyboardEvent => this._handleKeyboardEvent(keyboardEvent));

        this.countdownTimer = null;

        this.presentState = undefined;

        this.allStates = getStatesForJeopardyGame(this, operator, settings);
        this._parseAndValidateStates();

        this.presentState = this.allStates[0]; //idle state

        this.graphvizViewer = null;
        this._openGraphvizThing();

    }
    private _openGraphvizThing(): void {
        const graphvizWindow = window.open("../graphvizViewer/graphvizViewer.html", "graphvizViewer");
    }

    public handleGraphvizViewerReady(graphvizViewer: GraphvizViewer): void {
        graphvizViewer.updateGraphviz(null, this.presentState.name);
        this.graphvizViewer = graphvizViewer;
    }

    private _handleKeyboardEvent(keyboardEvent: KeyboardEvent): void {
        if (document.activeElement && document.activeElement.tagName === "INPUT") {
            return;
        }

        if (this.presentState && !this.operator.isPaused) {
            const transitionArray: StateMachineTransition[] = this.presentState.transitions;

            for (let i = 0; i < transitionArray.length; i++) {
                // do the first possible transition
                const transitionObj: StateMachineTransition = transitionArray[i];
                if (transitionObj.type === TransitionType.Keyboard && transitionObj.keys.includes(keyboardEvent.key)) {
                    if (this.DEBUG) {
                        console.log(`keyboard transition from keyboard key ${keyboardEvent.key}`)
                    }
                    if (transitionObj.fn) {
                        if (this.DEBUG) {
                            console.log(`calling transition fn ${transitionObj.fn.name}`);
                        }
                        transitionObj.fn.call(this.operator, keyboardEvent);
                    }
                    this.goToState(transitionObj.dest, keyboardEvent);
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

    private _startCountdownTimer(transitionObj: TimeoutTransition, keyboardEvent: KeyboardEvent): void {
        let durationMs;
        let setCountdownTimerMax = false;
        if (transitionObj.duration instanceof Function) {
            durationMs = transitionObj.duration();
            // todo check why we need to do this, probably can clean it up
            setCountdownTimerMax = true;
        } else {
            durationMs = transitionObj.duration;
        }

        if (this.DEBUG) {
            console.log(`Starting countdown timer with duration ${durationMs} millisec`);
        }

        const destinationStateName = transitionObj.dest;

        const countdownTimer = this.countdownTimer = new CountdownTimer(durationMs, this.audioManager);
        countdownTimer.progressElements.push(this.operatorWindowCountdownProgress);
        countdownTimer.textElements.push(this.operatorWindowCountdownText);

        if (transitionObj.countdownTimerShowDots) {
            const teamIndex = Number(keyboardEvent.key) - 1;
            const teamObj = this.operator.teamArray[teamIndex];
            countdownTimer.dotsElement = teamObj.presentationCountdownDots;
        } else {
            countdownTimer.progressElements.push(this.presentation.getProgressElement());
        }

        if (setCountdownTimerMax) {
            const newMax = this.settings.timeoutWaitForBuzzesMs; // how do we know to always use this as the max?
            countdownTimer.maxMs = newMax;
            countdownTimer.progressElements.forEach(elem => elem.attr("max", newMax));
        }

        countdownTimer.onFinished = () => {
            if (transitionObj.fn) {
                transitionObj.fn.call(this.operator);
            }
            this.goToState(destinationStateName);
        }
        countdownTimer.start();
    }

    public saveRemainingCountdownTime(): void {
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

    public goToState(destStateName: string, keyboardEvent?: KeyboardEvent): void {

        if (!(destStateName in this.stateMap)) {
            throw new RangeError(`can't go to state named "${destStateName}", state not found`);
        }

        if (this.countdownTimer) {
            this.countdownTimer.pause();
            //            this.countdownTimer = null;
        }

        if (this.DEBUG) {
            console.group(`changing states: ${this.presentState.name} --> ${destStateName}`);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        const handleOnExit = () => {
            if (this.presentState.onExit) {
                const functionToCall = this.presentState.onExit;
                if (!(functionToCall instanceof Function)) {
                    console.info(`state "${this.presentState.name}": cannot call onExit function "${functionToCall}", not a function`);
                    return;
                }
                if (this.DEBUG) {
                    console.log(`Running the onExit function of ${this.presentState}: ${functionToCall.name}`);
                }
                functionToCall.call(this); //todo fix this, because onEnter always is an operatorInstance call
            }
        }

        const handleTransitionIf = () => {
            const transitionArray = this.presentState.transitions;
            for (let i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === TransitionType.If) {
                    if (this.DEBUG) {
                        console.log(`Transition type if: the condition function is ${transitionObj.condition.name}`);
                    }
                    if (transitionObj.condition.call(this.operator, keyboardEvent)) {
                        this.goToState(transitionObj.then.dest, keyboardEvent);
                    } else {
                        this.goToState(transitionObj.else.dest, keyboardEvent);
                    }
                }
                break;
            }
        }

        const handleShowSlide = () => {
            if (this.presentState.showPresentationSlide) {
                if (this.presentation.slideNames.includes(this.presentState.showPresentationSlide)) {
                    if (this.DEBUG) {
                        console.log(`Showing presentation slide "${this.presentState.showPresentationSlide}"`);
                    }
                    this.presentation.showSlide(this.presentState.showPresentationSlide);
                } else {
                    console.warn(`entering state "${this.presentState.name}": can't show slide "${this.presentState.showPresentationSlide}", slide not found`);
                }
            }
        }

        const handleOnEnter = () => {
            if (this.presentState.onEnter) {

                const functionToCall = this.presentState.onEnter;

                if (this.DEBUG) {
                    console.log(`Running the onEnter function: ${functionToCall.name}`);
                }

                //todo don't use global reference to operator instnace!
                //todo make this not suck, because onExit call is not an operatorInstance call
                const rv = functionToCall.call(this.operator, keyboardEvent);

                if (rv && rv.constructor.name === "Promise") {

                    const transitionArray = this.presentState.transitions;
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

        const startCountdownTimerIfNeeded = (triggeringKeyboardEvent: KeyboardEvent) => {
            const transitionArray = this.presentState.transitions;
            for (let i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === TransitionType.Timeout) {
                    this._startCountdownTimer(transitionObj, triggeringKeyboardEvent);
                    this.operatorWindowDivStateName.html(`${destStateName} &rarr; ${transitionObj.dest}`);
                    break;
                }
            }
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////////

        handleOnExit.call(this);

        const previousState = this.presentState;
        this.presentState = this.stateMap[destStateName];
        this.operatorWindowDivStateName.html(destStateName);

        // TODO why can't I declare these as function name(){...} ???
        handleShowSlide.call(this);
        handleOnEnter.call(this);
        startCountdownTimerIfNeeded.call(this, keyboardEvent);

        if (this.graphvizViewer) {
            this.graphvizViewer.updateGraphviz(previousState.name, this.presentState.name);
        }

        if (this.DEBUG) {
            console.groupEnd();
        }

        handleTransitionIf.call(this);


    }

    private _parseAndValidateStates(): void {

        // pass one of two - add states to stateMap
        this.allStates.forEach((stateObj: StateMachineState) => {
            this.stateMap[stateObj.name] = stateObj;

            if (stateObj.showPresentationSlide &&
                !this.presentation.slideNames.includes(stateObj.showPresentationSlide)) {
                console.warn(`state "${stateObj.name}": showSlide: unknown slide "${stateObj.showPresentationSlide}"`);
            }

        }, this);

        // pass two of two - validate all the transitions
        this.allStates.forEach((stateObj: StateMachineState) => {

            const keyboardKeysUsedInTransitionsFromThisState: KeyboardKeysUsed = {};

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
                    case TransitionType.Timeout: {
                        if (!transitionObj.duration) {
                            printWarning(stateObj.name, transitionIndex,
                                "timeout has no duration property");
                        }
                        break;
                    }
                    case TransitionType.Keyboard: {
                        const keyboardKeys = transitionObj.keys;
                        if (!keyboardKeys) {
                            printWarning(stateObj.name, transitionIndex,
                                `no keys for keyboard transition`);
                        }

                        //TODO I think this check is not needed now that I'm using typescript
                        if (keyboardKeys.constructor.name !== "String") {
                            printWarning(stateObj.name, transitionIndex,
                                `property keys has type ${keyboardKeys.constructor.name}, expected String`);
                        }

                        // make sure each keyboard key is not used in multiple transitions from this state
                        for (let i = 0; i < keyboardKeys.length; i++) {
                            const key = keyboardKeys.charAt(i);
                            if (key in keyboardKeysUsedInTransitionsFromThisState) {
                                printWarning(stateObj.name, transitionIndex,
                                    `keyboard key "${key}" was already used in a transition from this state: ${keyboardKeysUsedInTransitionsFromThisState[key]}`);
                            } else {
                                keyboardKeysUsedInTransitionsFromThisState[key] = transitionIndex;
                            }
                        }

                        break;
                    }
                    case TransitionType.Manual:
                        this.manualTriggerMap[transitionObj.triggerName] = transitionObj;
                        break;

                    case TransitionType.Promise:
                        // no further validation needed
                        break;

                    case TransitionType.If:
                        if (!(transitionObj.condition instanceof Function)) {
                            printWarning(stateObj.name, transitionIndex,
                                `condition is not a function: ${transitionObj.condition}`);
                        }
                        if (!(transitionObj.then.dest in this.stateMap)) {
                            printWarning(stateObj.name, transitionIndex,
                                `unknown 'then' state "${transitionObj.then}"`);
                        }
                        if (!(transitionObj.else.dest in this.stateMap)) {
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
