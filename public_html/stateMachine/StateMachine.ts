import { Operator } from "../operator/Operator.js";
import { Settings } from "../Settings.js";
import { AudioManager } from "../operator/AudioManager.js";
import { Presentation } from "../presentation/Presentation.js";
import { CountdownTimer } from "../CountdownTimer.js";
import { getStatesForJeopardyGame } from "./statesForJeopardyGame.js";
import { StateMachineState, StateMachineTransition, KeyboardTransition, TimeoutTransition, TransitionType } from "./stateInterfaces.js";
import { generateGraphvizImpl } from "./generateGraphviz.js";
import { GraphvizViewer } from "../graphvizViewer/graphvizViewer.js";
import { Clue } from "../interfaces.js";

interface StateMap {
    [stateName: string]: StateMachineState;
}

interface KeyboardKeysUsed {
    [keyboardKey: string]: number;
}

export class StateMachine {
    public readonly operator: Operator;
    public readonly settings: Settings;
    public remainingQuestionTimeMs = -1;

    private readonly audioManager: AudioManager;
    private readonly presentation: Presentation;
    private readonly operatorWindowCountdownProgress: HTMLProgressElement;
    private readonly operatorWindowCountdownText: HTMLDivElement;
    private readonly operatorWindowDivStateName: HTMLDivElement;
    private readonly stateMap: StateMap = {};
    private readonly DEBUG = true;
    private graphvizViewer: GraphvizViewer;
    private countdownTimer: CountdownTimer;
    private presentState: StateMachineState;
    private allStates: StateMachineState[];

    constructor(settings: Settings, operator: Operator, presentation: Presentation, audioManager: AudioManager) {
        this.operator = operator;
        this.presentation = presentation;
        this.settings = settings;
        this.audioManager = audioManager;

        this.operatorWindowCountdownProgress = document.querySelector("div#state-machine-viz progress#countdown");
        this.operatorWindowCountdownText = document.querySelector("div#state-machine-viz div#remaining");
        this.operatorWindowDivStateName = document.querySelector("div#state-machine-viz div#state-name");

        window.addEventListener("keydown", keyboardEvent => this.handleKeyboardEvent(keyboardEvent));

        this.allStates = getStatesForJeopardyGame(this, operator, settings);
        this.parseAndValidateStates();

        this.presentState = this.allStates[0]; //idle state

        this.openGraphvizThing();

    }
    private openGraphvizThing(): void {
        window.open("../graphvizViewer/graphvizViewer.html", "graphvizViewer");
        // The graphviz viewer window will call StateMachine.handleGraphvizViewerReady().
    }

    public handleGraphvizViewerReady(graphvizViewer: GraphvizViewer): void {
        graphvizViewer.updateGraphviz(null, this.presentState.name);
        this.graphvizViewer = graphvizViewer;
    }

    private handleKeyboardEvent(keyboardEvent: KeyboardEvent): void {
        if (document.activeElement?.tagName === "INPUT") {
            // Don't do anything if the cursor is in a <input> field.
            return;
        }

        if (this.presentState && !this.operator.isPaused) {

            // Search for the first transition with a keyboard transition for the key pressed.
            for (let i = 0; i < this.presentState.transitions.length; i++) {
                const transitionObj = this.presentState.transitions[i];
                if (transitionObj.type === TransitionType.Keyboard && transitionObj.keyboardKeys.includes(keyboardEvent.key)) {
                    if (this.DEBUG) {
                        console.log(`keyboard transition from keyboard key ${keyboardEvent.key}`)
                    }

                    if (transitionObj.fn) {
                        if (this.DEBUG) {
                            console.log(`calling transition fn ${transitionObj.fn.name}`);
                        }
                        transitionObj.fn(keyboardEvent);
                    }

                    this.goToState(transitionObj.destination, keyboardEvent);
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

    private startCountdownTimer(timeoutTransitionObj: TimeoutTransition, keyboardEvent: KeyboardEvent): void {
        let durationMs;
        let setCountdownTimerMax = false;
        if (timeoutTransitionObj.duration instanceof Function) {
            durationMs = timeoutTransitionObj.duration();
            // todo check why we need to do this, probably can clean it up
            setCountdownTimerMax = true;
        } else {
            durationMs = timeoutTransitionObj.duration;
        }

        if (this.DEBUG) {
            console.log(`Starting countdown timer with duration ${durationMs} millisec`);
        }

        this.countdownTimer = new CountdownTimer(durationMs, this.audioManager);
        this.countdownTimer.progressElements.push(this.operatorWindowCountdownProgress);
        this.countdownTimer.textDivs.push(this.operatorWindowCountdownText);

        if (timeoutTransitionObj.countdownTimerShowDots) {
            const teamIndex = Number(keyboardEvent.key) - 1;
            const teamObj = this.operator.teamArray[teamIndex];
            this.countdownTimer.dotsTables = [teamObj.presentationCountdownDots];
        } else {
            this.countdownTimer.progressElements.push(this.presentation.getProgressElement());
        }

        if (setCountdownTimerMax) {
            const newMax = this.settings.timeoutWaitForBuzzesMs; // how do we know to always use this as the max?
            this.countdownTimer.maxMs = newMax;
            this.countdownTimer.progressElements.forEach(elem => elem.setAttribute("max", String(newMax)));
        }

        this.countdownTimer.onFinished = () => {
            if (timeoutTransitionObj.fn) {
                timeoutTransitionObj.fn();
            }
            this.goToState(timeoutTransitionObj.destination);
        }
        this.countdownTimer.start();
    }

    public saveRemainingCountdownTime(): void {
        if (this.countdownTimer) {
            this.remainingQuestionTimeMs = this.countdownTimer.remainingMs;
        }
    }

    public manualTrigger(triggerName: string): void {
        // Search for the first transition which has a matching manual trigger.
        for (let i = 0; i < this.presentState.transitions.length; i++) {
            const transitionObj = this.presentState.transitions[i];
            if (transitionObj.type === TransitionType.ManualTrigger && transitionObj.triggerName === triggerName) {
                if (this.DEBUG) {
                    console.log(`Manual trigger "${triggerName}" from ${this.presentState.name} to ${transitionObj.destination}`);
                }
                this.goToState(transitionObj.destination);
                return;
            }
        }
        console.warn(`the present state (${this.presentState.name}) does not have any manual trigger transitions called "${triggerName}"`);
    }

    public goToState(destStateName: string, keyboardEvent?: KeyboardEvent): void {
        if (!(destStateName in this.stateMap)) {
            throw new RangeError(`can't go to state named "${destStateName}", state not found`);
        }

        if (this.countdownTimer) {
            this.countdownTimer.pause();
        }

        if (this.DEBUG) {
            console.group(`changing states: ${this.presentState.name} --> ${destStateName}`);
        }

        ////////////////////////////////////////////////////////////////////////////////////////
        /////////////////// Handle onExit function of the state we're leaving //////////////////
        ////////////////////////////////////////////////////////////////////////////////////////
        if (this.presentState.onExit) {
            if (this.DEBUG) {
                console.log(`Running the onExit function of ${this.presentState}: ${this.presentState.onExit.name}`);
            }
            this.presentState.onExit();
        }

        const previousState = this.presentState;
        this.presentState = this.stateMap[destStateName];
        this.operatorWindowDivStateName.innerHTML = destStateName;
        if (this.graphvizViewer) {
            this.graphvizViewer.updateGraphviz(previousState.name, this.presentState.name);
        }

        const transitionArray = this.presentState.transitions;

        ///////////////////////////////////////////////////////////////////////////////////
        ////////////////////////// Handle showPresentationSlide ///////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////
        if (this.presentState.presentationSlideToShow) {
            if (this.presentation.slideNames.includes(this.presentState.presentationSlideToShow)) {
                if (this.DEBUG) {
                    console.log(`Showing presentation slide "${this.presentState.presentationSlideToShow}"`);
                }
                this.presentation.showSlide(this.presentState.presentationSlideToShow);
            } else {
                console.warn(`entering state "${this.presentState.name}": can't show slide "${this.presentState.presentationSlideToShow}", slide not found`);
            }
        }

        ///////////////////////////////////////////////////////////////////////////////
        /////////////////////////// Handle onEnter function ///////////////////////////
        ///////////////////////////////////////////////////////////////////////////////
        if (this.presentState.onEnter) {
            if (this.DEBUG) {
                console.log(`Running the onEnter function on ${this.presentState.name}: ${this.presentState.onEnter.name}`);
            }
            this.presentState.onEnter(keyboardEvent);
        }


        //////////////////////////////////////////////////////////////////////
        ///////////////////// Start countdown timer if needed ////////////////
        //////////////////////////////////////////////////////////////////////
        // Search for the first timeout transition.
        for (let i = 0; i < transitionArray.length; i++) {
            const transitionObj = transitionArray[i];
            if (transitionObj.type === TransitionType.Timeout) {
                this.startCountdownTimer(transitionObj, keyboardEvent);
                this.operatorWindowDivStateName.innerHTML = destStateName + " &rarr; " + transitionObj.destination;
                break;
            }
        }

        //////////////////////////////////////////////////////////////
        //////////////// Handle promise transition ///////////////////
        //////////////////////////////////////////////////////////////
        for (let i = 0; i < transitionArray.length; i++) {
            const transitionObj = transitionArray[i];

            if (transitionObj.type === TransitionType.Promise) {
                const thePromise: Promise<void> = transitionObj.functionToGetPromise();
                thePromise.then(
                    () => this.goToState(transitionObj.destination)
                ).catch(
                    (err: Error) => {
                        alert("promise rejected: " + err);
                        throw err;
                    }
                );
                break;
            }
        }


        if (this.DEBUG) {
            console.groupEnd();
        }

        ////////////////////////////////////////////////////////////////
        /////////////////////// Handle if transition ///////////////////
        ////////////////////////////////////////////////////////////////
        for (let i = 0; i < transitionArray.length; i++) {
            const transitionObj = transitionArray[i];
            if (transitionObj.type === TransitionType.If) {
                if (this.DEBUG) {
                    console.log(`Transition type if: the condition function is ${transitionObj.condition.name}`);
                }
                if (transitionObj.condition(keyboardEvent)) {
                    this.goToState(transitionObj.then.destination, keyboardEvent);
                } else {
                    this.goToState(transitionObj.else.destination, keyboardEvent);
                }
            }
            break;
        }


    }

    private parseAndValidateStates(): void {

        // Pass one of two: populate the stateMap; validate the slides.
        this.allStates.forEach((stateObj: StateMachineState) => {
            this.stateMap[stateObj.name] = stateObj;

            if (stateObj.presentationSlideToShow &&
                !this.presentation.slideNames.includes(stateObj.presentationSlideToShow)) {
                console.warn(`state "${stateObj.name}": showSlide: unknown slide "${stateObj.presentationSlideToShow}"`);
            }

        }, this);

        // Pass two of two - validate all the transitions.
        this.allStates.forEach((stateObj: StateMachineState) => {

            const keyboardKeysUsedInTransitionsFromThisState: KeyboardKeysUsed = {};

            stateObj.transitions.forEach((transitionObj: StateMachineTransition, transitionIndex: number) => {

                if (transitionObj.type !== TransitionType.If) {
                    if (!transitionObj.destination) {
                        printWarning(stateObj.name, transitionIndex,
                            "no destination state");
                        return;
                    }
                    if (!(transitionObj.destination in this.stateMap)) {
                        printWarning(stateObj.name, transitionIndex,
                            `unknown destination state "${transitionObj.destination}"`);
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
                        const keyboardKeys = transitionObj.keyboardKeys;
                        if (!keyboardKeys) {
                            printWarning(stateObj.name, transitionIndex,
                                `no keys for keyboard transition`);
                        }

                        // Make sure each keyboard key is not used in multiple transitions from this state.
                        for (let i = 0; i < keyboardKeys.length; i++) {
                            const key = keyboardKeys.charAt(i);
                            if (key in keyboardKeysUsedInTransitionsFromThisState) {
                                printWarning(stateObj.name, transitionIndex,
                                    `keyboard key "${key}" was already used in a transition from this state with index ${keyboardKeysUsedInTransitionsFromThisState[key]}`);
                            } else {
                                keyboardKeysUsedInTransitionsFromThisState[key] = transitionIndex;
                            }
                        }

                        break;
                    }
                    case TransitionType.ManualTrigger:
                        // no further validation needed.
                        break;

                    case TransitionType.Promise:
                        // no further validation needed.
                        break;

                    case TransitionType.If:
                        if (!(transitionObj.then.destination in this.stateMap)) {
                            printWarning(stateObj.name, transitionIndex,
                                `unknown 'then' state "${transitionObj.then}"`);
                        }
                        if (!(transitionObj.else.destination in this.stateMap)) {
                            printWarning(stateObj.name, transitionIndex,
                                `unknown 'else' state "${transitionObj.else}"`);
                        }
                        break;

                    default:
                        printWarning(stateObj.name, transitionIndex,
                            `unknown transition type!`);
                        break;
                }

                function printWarning(stateName: string, transitionIdx: number, message: string) {
                    console.warn(`state "${stateName}": transition ${transitionIdx}: ${message}`);
                }

            }, this);

        }, this);

    }

    public generateDotFileForGraphviz(): void {
        generateGraphvizImpl(this.allStates);
    }



}
