import { AudioManager } from "../AudioManager";
import { querySelectorAndCheck } from "../common";
import { CountdownTimer } from "../CountdownTimer";
import { Operator } from "../operator/Operator";
import { Presentation } from "../presentation/Presentation";
import { Settings } from "../Settings";
import { StateMachineViewer } from "../stateMachineViewer/StateMachineViewer";
import { getStatesForJeopardyGame } from "./statesForJeopardyGame";
import { CountdownBehavior, StateMachineState, TimeoutTransition } from "./typesForStateMachine";


export class StateMachine {
    private readonly DEBUG = false;
    private readonly OPERATOR: Operator;
    private readonly AUDIO_MANAGER: AudioManager;
    private readonly PRESENTATION: Presentation;
    private readonly OPERATOR_WINDOW_COUNTDOWN_PROGRESS: HTMLProgressElement;
    private readonly OPERATOR_WINDOW_COUNTDOWN_TEXT: HTMLDivElement;
    private readonly OPERATOR_WINDOW_DIV_STATE_NAME: HTMLDivElement;
    private readonly STATE_MAP: { [stateName: string]: StateMachineState } = {};
    /**
     * Keep track of countdown timer going out of the state. In other words
     * it is the countdown timer that starts when you enter the state.
     */
    private readonly COUNTDOWN_TIMER_LEAVING_STATE: { [stateName: string]: CountdownTimer } = {};
    private readonly ALL_STATES: StateMachineState[];
    private readonly TABLE_OF_ALL_COUNTDOWN_TIMERS: HTMLTableElement;
    private stateMachineViewer?: StateMachineViewer;
    private presentState: StateMachineState;

    public constructor(settings: Settings, operator: Operator, presentation: Presentation, audioManager: AudioManager) {
        this.OPERATOR = operator;
        this.PRESENTATION = presentation;
        this.AUDIO_MANAGER = audioManager;

        this.OPERATOR_WINDOW_COUNTDOWN_PROGRESS = querySelectorAndCheck(document, "div#state-machine-viz progress");
        this.OPERATOR_WINDOW_COUNTDOWN_TEXT = querySelectorAndCheck(document, "div#state-machine-viz div.remaining-time-text");
        this.OPERATOR_WINDOW_DIV_STATE_NAME = querySelectorAndCheck(document, "div#state-machine-viz div#state-name");

        this.TABLE_OF_ALL_COUNTDOWN_TIMERS = querySelectorAndCheck(document, "table#state-machine-all-countdown-timers");

        window.addEventListener("keydown", keyboardEvent => this.handleKeyboardEvent(keyboardEvent));

        this.ALL_STATES = getStatesForJeopardyGame(operator, settings);
        this.validateStates();

        this.presentState = this.STATE_MAP["idle"];
    }

    public handleStateMachineViewerReady(stateMachineViewer: StateMachineViewer): void {
        stateMachineViewer.updateTrail(null, this.presentState.NAME);
        this.stateMachineViewer = stateMachineViewer;
    }

    private handleKeyboardEvent(keyboardEvent: KeyboardEvent): void {
        if (document.activeElement?.tagName === "INPUT") {
            // Don't do anything if the cursor is in a <input> field.
            return;
        }

        if (keyboardEvent.key.length !== 1) {
            // ignore non-printable characters https://stackoverflow.com/a/38802011/7376577
            return;
        }

        if (!this.OPERATOR.getIsPaused()) {

            // Search for the first transition with a keyboard transition for the key pressed.
            for (const transition of this.presentState.TRANSITIONS) {
                if (transition.TYPE === "keyboard" &&
                    transition.KEYBOARD_KEYS.toLowerCase().includes(keyboardEvent.key.toLowerCase())) {

                    if (transition.GUARD_CONDITION && !transition.GUARD_CONDITION(keyboardEvent)) {
                        continue;
                    }

                    if (this.DEBUG) {
                        console.log(`keyboard transition from keyboard key ${keyboardEvent.key}`);
                    }

                    if (transition.ON_TRANSITION) {
                        if (this.DEBUG) {
                            console.log(`calling transition fn ${transition.ON_TRANSITION.name}`);
                        }
                        transition.ON_TRANSITION(keyboardEvent);
                    }

                    this.goToState(transition.DESTINATION, keyboardEvent);
                    break;
                }
            }
        }
    }

    public setPaused(isPaused: boolean): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        this.COUNTDOWN_TIMER_LEAVING_STATE[this.presentState.NAME]?.setPaused(isPaused);
    }


    public manualTrigger(TRIGGER_NAME: string): void {
        // Search for the first transition which has a matching manual trigger.
        for (const transition of this.presentState.TRANSITIONS) {
            if (transition.TYPE === "manualTrigger" && transition.TRIGGER_NAME === TRIGGER_NAME) {
                if (transition.GUARD_CONDITION && !transition.GUARD_CONDITION()) {
                    continue;
                }
                if (this.DEBUG) {
                    console.log(`Manual trigger "${TRIGGER_NAME}" from ${this.presentState.NAME} to ${transition.DESTINATION}`);
                }
                this.goToState(transition.DESTINATION);
                return;
            }
        }
        console.warn(`the present state (${this.presentState.NAME}) does not have any manual trigger transitions called "${TRIGGER_NAME}"`);
    }

    public goToState(destinationStateName: string, keyboardEvent?: KeyboardEvent): void {
        if (!(destinationStateName in this.STATE_MAP)) {
            throw new RangeError(`can't go to state named "${destinationStateName}", state not found`);
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        this.COUNTDOWN_TIMER_LEAVING_STATE[this.presentState.NAME]?.pause();

        if (this.DEBUG) {
            console.group(`changing states: ${this.presentState.NAME} --> ${destinationStateName}`);
        }

        ////////////////////////////////////////////////////////////////////////////////////////
        /////////////////// Call onExit function of the state we're leaving ////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////
        if (this.presentState.ON_EXIT) {
            if (this.DEBUG) {
                console.log(`Running the onExit function of ${this.presentState.NAME}: ${this.presentState.ON_EXIT.name}`);
            }
            this.presentState.ON_EXIT();
        }

        ////////////////////////////////////////////////////////////////////////////////////////
        /////////////////////////////// Change the state ///////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////
        const previousState = this.presentState;
        this.presentState = this.STATE_MAP[destinationStateName];
        this.OPERATOR_WINDOW_DIV_STATE_NAME.innerHTML = destinationStateName;
        if (this.stateMachineViewer) {
            this.stateMachineViewer.updateTrail(previousState.NAME, this.presentState.NAME);
        }


        ///////////////////////////////////////////////////////////////////////////////////
        ////////////////////////// Change presentation slide //////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////
        if (this.presentState.PRESENTATION_SLIDE_TO_SHOW) {
            if (this.PRESENTATION.ALL_SLIDE_NAMES.has(this.presentState.PRESENTATION_SLIDE_TO_SHOW)) {
                if (this.DEBUG) {
                    console.log(`Showing presentation slide "${this.presentState.PRESENTATION_SLIDE_TO_SHOW}"`);
                }
                this.PRESENTATION.showSlide(this.presentState.PRESENTATION_SLIDE_TO_SHOW);
            } else {
                console.warn(`entering state "${this.presentState.NAME}": can't show slide "${this.presentState.PRESENTATION_SLIDE_TO_SHOW}", slide not found`);
            }
        }

        if (this.presentState.INSTRUCTIONS) {
            this.OPERATOR.setInstructions(this.presentState.INSTRUCTIONS);
        }

        ///////////////////////////////////////////////////////////////////////////////
        /////////////////////////// Call onEnter function /////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////
        if (this.presentState.ON_ENTER) {
            if (this.DEBUG) {
                console.log(`Running the onEnter function on ${this.presentState.NAME}: ${this.presentState.ON_ENTER.name}`);
            }
            this.presentState.ON_ENTER(keyboardEvent);
        }


        //////////////////////////////////////////////////////////////////////
        ///////////////////// Start countdown timer ///////// ////////////////
        //////////////////////////////////////////////////////////////////////
        const transitionArray = this.presentState.TRANSITIONS;
        let foundCountdownTimer = false;
        // Search for the first timeout transition.
        for (const transition of transitionArray) {
            if (transition.TYPE === "timeout") {
                if (transition.GUARD_CONDITION && !transition.GUARD_CONDITION()) {
                    continue;
                }

                const countdownTimer = this.COUNTDOWN_TIMER_LEAVING_STATE[this.presentState.NAME];

                if (transition.BEHAVIOR === CountdownBehavior.ResetTimerEveryTimeYouEnterTheState) {
                    countdownTimer.reset();
                }

                /*
                Once a team has buzzed and we're waiting for them to answer, we want some special stuff to happen:
                - In the presentation window: the state machine uses a timeout transition, but instead of showing a
                    progress bar like what would normally happen for a timeout transition, we want to show it on
                    the nine countdown dots.
                - In the operator window: use a second <progress> element, instead of using the same one that shows
                    how much time is left for teams to buzz in.
                */
                if (transition.IS_WAITING_FOR_TEAM_TO_ANSWER_AFTER_BUZZ) {
                    if (keyboardEvent) {

                        const teamIndex = Number(keyboardEvent.key) - 1;
                        const team = this.OPERATOR.getTeam(teamIndex);
                        if (team) {
                            const dotsInPresentationWindow = team.getCountdownDotsInPresentationWindow();
                            if (dotsInPresentationWindow) {
                                countdownTimer.addDotsTable(dotsInPresentationWindow);
                            }
                            const progressElement = team.getProgressElementInOperatorWindow();
                            if (progressElement) {
                                countdownTimer.addProgressElement(progressElement);
                            }
                        } else {
                            console.error(`no team for keyboard key ${keyboardEvent.key}`);
                        }
                    } else {
                        console.error("keyboardEvent is undefined when transition.isWaitingForTeamToAnswerAfterBuzz is true");
                    }

                    if (transition.BEHAVIOR !== CountdownBehavior.ResetTimerEveryTimeYouEnterTheState) {
                        console.warn(`in state ${this.presentState.NAME}: transition to ${transition.DESTINATION}: dots table and progress element will be repeatedly added to the countdown timer`);
                    }

                }

                countdownTimer.startOrResume();

                this.OPERATOR_WINDOW_DIV_STATE_NAME.innerHTML = destinationStateName + " &rarr; " + transition.DESTINATION;
                // We could support multiple timeout transitions, although I have no need to
                foundCountdownTimer = true;
                break;
            }
        }
        if (!foundCountdownTimer) {
            // remove text on the right which shows time left
            this.OPERATOR_WINDOW_COUNTDOWN_TEXT.innerHTML = "";

            // remove green bar in operator window
            this.OPERATOR_WINDOW_COUNTDOWN_PROGRESS.setAttribute("value", "0");

            // remove red bar in presentation window
            this.PRESENTATION.getProgressElementForStateMachine().setAttribute("value", "0");
        }

        //////////////////////////////////////////////////////////////
        //////////////// Handle promise transition ///////////////////
        //////////////////////////////////////////////////////////////
        // Search for the first promise transition.
        for (const transition of transitionArray) {
            if (transition.TYPE === "promise") {
                if (transition.GUARD_CONDITION && !transition.GUARD_CONDITION()) {
                    continue;
                }
                const thePromise: Promise<void> = transition.FUNCTION_TO_GER_PROMISE();
                thePromise.then(
                    () => this.goToState(transition.DESTINATION)
                ).catch(
                    (err: Error) => {
                        alert(`promise rejected: ${err.message}`);
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
        // Search for the first if transition.
        for (const transition of transitionArray) {
            if (transition.TYPE === "if") {
                if (this.DEBUG) {
                    console.log(`Transition type if: the condition function is ${transition.CONDITION.name}`);
                }
                if (transition.CONDITION()) {
                    if (transition.THEN.ON_TRANSITION) {
                        if (this.DEBUG) {
                            console.log(`Running the then.ON_TRANSITION function of ${this.presentState.NAME}: ${transition.THEN.ON_TRANSITION.name}`);
                        }
                        transition.THEN.ON_TRANSITION();

                    }
                    this.goToState(transition.THEN.DESTINATION, keyboardEvent);
                } else {
                    if (transition.ELSE.ON_TRANSITION) {
                        if (this.DEBUG) {
                            console.log(`Running the else.ON_TRANSITIONThen function of ${this.presentState.NAME}: ${transition.ELSE.ON_TRANSITION.name}`);
                        }
                        transition.ELSE.ON_TRANSITION();

                    }
                    this.goToState(transition.ELSE.DESTINATION, keyboardEvent);
                }
            }
            // We could support multiple if transitions, although I have no need to
            break;
        }



    }

    private createCountdownTimerForTransition(timeoutTransition: TimeoutTransition): CountdownTimer {

        const countdownTimer = new CountdownTimer(timeoutTransition.INITIAL_DURATION, this.AUDIO_MANAGER);

        countdownTimer.onFinished = (): void => {
            timeoutTransition.ON_TRANSITION?.();
            this.goToState(timeoutTransition.DESTINATION);
        };

        /*
        Once a team has buzzed and we're waiting for them to answer, we want some special stuff to happen:
        - In the presentation window: the state machine uses a timeout transition, but instead of showing a
            progress bar like what would normally happen for a timeout transition, we want to show it on
            the nine countdown dots.
        - In the operator window: use a second <progress> element, instead of using the same one that shows
            how much time is left for teams to buzz in.
        */
        if (!timeoutTransition.IS_WAITING_FOR_TEAM_TO_ANSWER_AFTER_BUZZ) {
            countdownTimer.addTextElement(this.OPERATOR_WINDOW_COUNTDOWN_TEXT);
            countdownTimer.addProgressElement(this.PRESENTATION.getProgressElementForStateMachine());
            countdownTimer.addProgressElement(this.OPERATOR_WINDOW_COUNTDOWN_PROGRESS);
        }


        return countdownTimer;

    }

    private validateStates(): void {

        // Pass one of two: populate the stateMap, and validate the presentation slide names are available.
        this.ALL_STATES.forEach((state: StateMachineState) => {
            this.STATE_MAP[state.NAME] = state;

            if (state.PRESENTATION_SLIDE_TO_SHOW &&
                !this.PRESENTATION.ALL_SLIDE_NAMES.has(state.PRESENTATION_SLIDE_TO_SHOW)) {
                console.warn(`state "${state.NAME}": showSlide: unknown slide "${state.PRESENTATION_SLIDE_TO_SHOW}"`);
            }

        }, this);

        // Pass two of two: validate all the transitions, and create countdown timers for timeout transitions.
        this.ALL_STATES.forEach((state: StateMachineState) => {

            const keyboardKeysUsedInTransitionsFromThisState: { [keyboardKey: string]: number } = {};

            let stateHasTimeoutTransition = false;

            state.TRANSITIONS.forEach((transition, transitionIndex) => {

                // Verify all the destination states exist.
                if (transition.TYPE !== "if") {
                    if (!(transition.DESTINATION in this.STATE_MAP)) {
                        printWarning(state.NAME, transitionIndex,
                            `unknown DESTINATION state "${transition.DESTINATION}"`);
                    }
                }

                switch (transition.TYPE) {
                    case "keyboard": {
                        // Verify each keyboard key is not used in multiple transitions leaving this state.
                        const keyboardKeys: string = transition.KEYBOARD_KEYS;
                        for (let i = 0; i < keyboardKeys.length; i++) {
                            const keyboardKey = keyboardKeys.charAt(i);
                            if (keyboardKey in keyboardKeysUsedInTransitionsFromThisState) {
                                printWarning(state.NAME, transitionIndex,
                                    `keyboard key "${keyboardKey}" was already used in a transition from this state with index ${keyboardKeysUsedInTransitionsFromThisState[keyboardKey]}`);
                            } else {
                                keyboardKeysUsedInTransitionsFromThisState[keyboardKey] = transitionIndex;
                            }
                        }

                        break;
                    }

                    case "if": {
                        // Verify DESTINATION states exist.
                        if (!(transition.THEN.DESTINATION in this.STATE_MAP)) {
                            printWarning(state.NAME, transitionIndex,
                                `unknown 'then' state "${transition.THEN.DESTINATION}"`);
                        }
                        if (!(transition.ELSE.DESTINATION in this.STATE_MAP)) {
                            printWarning(state.NAME, transitionIndex,
                                `unknown 'else' state "${transition.ELSE.DESTINATION}"`);
                        }
                        break;
                    }

                    // Initialize countdown timers for all timeout transitions.
                    case "timeout": {

                        if (stateHasTimeoutTransition) {
                            printWarning(state.NAME, transitionIndex,
                                "multiple timeout transitions leaving a state is not supported (because the countdownTimerForState map uses the state name as the key)");
                        }

                        const countdownTimer = this.createCountdownTimerForTransition(transition);

                        // create a progress element in the operator page - probably only needed for debugging
                        this.COUNTDOWN_TIMER_LEAVING_STATE[state.NAME] = countdownTimer;
                        const tr = document.createElement("tr");

                        const tdStateLabel = document.createElement("td");
                        tdStateLabel.innerHTML = `(${transition.BEHAVIOR}) ${state.NAME} &rarr; ${transition.DESTINATION} `;
                        tr.appendChild(tdStateLabel);

                        const tdProgressElement = document.createElement("td");
                        const progressElement = document.createElement("progress");
                        progressElement.setAttribute("value", "0");
                        countdownTimer.addProgressElement(progressElement);
                        tdProgressElement.appendChild(progressElement);
                        tr.appendChild(tdProgressElement);

                        const tdRemainingTimeText = document.createElement("td");
                        countdownTimer.addTextElement(tdRemainingTimeText);
                        tr.appendChild(tdRemainingTimeText);


                        this.TABLE_OF_ALL_COUNTDOWN_TIMERS.appendChild(tr);
                        stateHasTimeoutTransition = true;
                        break;
                    }
                }

                function printWarning(stateName: string, transitionIdx: number, message: string): void {
                    console.warn(`state "${stateName}": transition ${transitionIdx}: ${message}`);
                }

            }, this);

        }, this);

    }

    public getAllStates(): StateMachineState[] {
        return this.ALL_STATES;
    }

    public getPresentState(): StateMachineState {
        return this.presentState;
    }

    public getCountdownTimerForState(stateName: string): CountdownTimer {
        return this.COUNTDOWN_TIMER_LEAVING_STATE[stateName];
    }

}
