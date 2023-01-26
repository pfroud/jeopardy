import { CountdownTimer } from "../CountdownTimer";
import { StateMachineViewer } from "../stateMachineViewer/StateMachineViewer";
import { Operator } from "../operator/Operator";
import { Presentation } from "../presentation/Presentation";
import { Settings } from "../Settings";
import { CountdownBehavior, StateMachineState, StateMachineTransition, TimeoutTransition } from "./stateInterfaces";
import { getStatesForJeopardyGame } from "./statesForJeopardyGame";


export class StateMachine {
    private readonly DEBUG = false;
    private readonly operator: Operator;
    private readonly presentation: Presentation;
    private readonly operatorWindowCountdownProgress: HTMLProgressElement;
    private readonly operatorWindowCountdownText: HTMLDivElement;
    private readonly operatorWindowDivStateName: HTMLDivElement;
    private readonly stateMap: { [stateName: string]: StateMachineState } = {};
    /**
     * Keep track of countdown timer going out of the state. In other words
     * it is the countdown timer that starts when you enter the state.
     */
    private readonly countdownTimerLeavingState: { [stateName: string]: CountdownTimer } = {};
    private readonly allStates: StateMachineState[];
    private readonly tableOfAllCountdownTimers: HTMLTableElement;
    private stateMachineViewer: StateMachineViewer;
    private presentState: StateMachineState;

    constructor(settings: Settings, operator: Operator, presentation: Presentation) {
        this.operator = operator;
        this.presentation = presentation;

        this.operatorWindowCountdownProgress = document.querySelector("div#state-machine-viz progress");
        this.operatorWindowCountdownText = document.querySelector("div#state-machine-viz div.remaining-time-text");
        this.operatorWindowDivStateName = document.querySelector("div#state-machine-viz div#state-name");

        this.tableOfAllCountdownTimers = document.querySelector("table#state-machine-all-countdown-timers");

        window.addEventListener("keydown", keyboardEvent => this.handleKeyboardEvent(keyboardEvent));

        this.allStates = getStatesForJeopardyGame(operator, settings);
        this.validateStates();

        this.presentState = this.stateMap["idle"];
    }

    public handleStateMachineViewerReady(stateMachineViewer: StateMachineViewer): void {
        stateMachineViewer.updateTrail(null, this.presentState.name);
        this.stateMachineViewer = stateMachineViewer;
    }

    private handleKeyboardEvent(keyboardEvent: KeyboardEvent): void {
        if (document.activeElement?.tagName === "INPUT") {
            // Don't do anything if the cursor is in a <input> field.
            return;
        }

        if (keyboardEvent.key.length != 1) {
            // ignore non-printable characters https://stackoverflow.com/a/38802011/7376577
            return;
        }

        if (this.presentState && !this.operator.getIsPaused()) {

            // Search for the first transition with a keyboard transition for the key pressed.
            for (let i = 0; i < this.presentState.transitions.length; i++) {
                const transition = this.presentState.transitions[i];
                if (transition.type === "keyboard" && transition.keyboardKeys.includes(keyboardEvent.key)) {

                    if (transition.guardCondition && !transition.guardCondition(keyboardEvent)) {
                        continue;
                    }

                    if (this.DEBUG) {
                        console.log(`keyboard transition from keyboard key ${keyboardEvent.key}`);
                    }

                    if (transition.onTransition) {
                        if (this.DEBUG) {
                            console.log(`calling transition fn ${transition.onTransition.name}`);
                        }
                        transition.onTransition(keyboardEvent);
                    }

                    this.goToState(transition.destination, keyboardEvent);
                    break;
                }
            }
        }
    }

    public setPaused(isPaused: boolean): void {
        this.countdownTimerLeavingState[this.presentState.name]?.setPaused(isPaused);
    }


    public manualTrigger(triggerName: string): void {
        // Search for the first transition which has a matching manual trigger.
        for (let i = 0; i < this.presentState.transitions.length; i++) {
            const transition = this.presentState.transitions[i];
            if (transition.type === "manualTrigger" && transition.triggerName === triggerName) {
                if (transition.guardCondition && !transition.guardCondition()) {
                    continue;
                }
                if (this.DEBUG) {
                    console.log(`Manual trigger "${triggerName}" from ${this.presentState.name} to ${transition.destination}`);
                }
                this.goToState(transition.destination);
                return;
            }
        }
        console.warn(`the present state (${this.presentState.name}) does not have any manual trigger transitions called "${triggerName}"`);
    }

    public goToState(destinationStateName: string, keyboardEvent?: KeyboardEvent): void {
        if (!(destinationStateName in this.stateMap)) {
            throw new RangeError(`can't go to state named "${destinationStateName}", state not found`);
        }

        this.countdownTimerLeavingState[this.presentState.name]?.pause();

        if (this.DEBUG) {
            console.group(`changing states: ${this.presentState.name} --> ${destinationStateName}`);
        }

        ////////////////////////////////////////////////////////////////////////////////////////
        /////////////////// Call onExit function of the state we're leaving ////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////
        if (this.presentState.onExit) {
            if (this.DEBUG) {
                console.log(`Running the onExit function of ${this.presentState}: ${this.presentState.onExit.name}`);
            }
            this.presentState.onExit();
        }

        ////////////////////////////////////////////////////////////////////////////////////////
        /////////////////////////////// Change the state ///////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////
        const previousState = this.presentState;
        this.presentState = this.stateMap[destinationStateName];
        this.operatorWindowDivStateName.innerHTML = destinationStateName;
        if (this.stateMachineViewer) {
            this.stateMachineViewer.updateTrail(previousState.name, this.presentState.name);
        }


        ///////////////////////////////////////////////////////////////////////////////////
        ////////////////////////// Change presentation slide //////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////
        if (this.presentState.presentationSlideToShow) {
            if (this.presentation.allSlideNames.has(this.presentState.presentationSlideToShow)) {
                if (this.DEBUG) {
                    console.log(`Showing presentation slide "${this.presentState.presentationSlideToShow}"`);
                }
                this.presentation.showSlide(this.presentState.presentationSlideToShow);
            } else {
                console.warn(`entering state "${this.presentState.name}": can't show slide "${this.presentState.presentationSlideToShow}", slide not found`);
            }
        }

        ///////////////////////////////////////////////////////////////////////////////
        /////////////////////////// Call onEnter function /////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////
        if (this.presentState.onEnter) {
            if (this.DEBUG) {
                console.log(`Running the onEnter function on ${this.presentState.name}: ${this.presentState.onEnter.name}`);
            }
            this.presentState.onEnter(keyboardEvent);
        }


        //////////////////////////////////////////////////////////////////////
        ///////////////////// Start countdown timer ///////// ////////////////
        //////////////////////////////////////////////////////////////////////
        const transitionArray = this.presentState.transitions;
        let foundCountdownTimer = false;
        // Search for the first timeout transition.
        for (let i = 0; i < transitionArray.length; i++) {
            const transition = transitionArray[i];
            if (transition.type === "timeout") {
                if (transition.guardCondition && !transition.guardCondition()) {
                    continue;
                }

                const countdownTimer = this.countdownTimerLeavingState[this.presentState.name];

                if (transition.behavior == CountdownBehavior.ResetTimerEveryTimeYouEnterTheState) {
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
                if (transition.isWaitingForTeamToAnswerAfterBuzz) {
                    const teamIndex = Number(keyboardEvent.key) - 1;
                    const team = this.operator.getTeam(teamIndex);
                    countdownTimer.addDotsTable(team.getCountdownDotsInPresentationWindow());
                    countdownTimer.addProgressElement(team.getProgressElementInOperatorWindow());

                    if (transition.behavior != CountdownBehavior.ResetTimerEveryTimeYouEnterTheState) {
                        console.warn(`in state ${this.presentState.name}: transition to ${transition.destination}: dots table and progress element will be repeatedly added to the countdown timer`);
                    }

                }

                countdownTimer.startOrResume();

                this.operatorWindowDivStateName.innerHTML = destinationStateName + " &rarr; " + transition.destination;
                // We could support multiple timeout transitions, although I have no need to
                foundCountdownTimer = true;
                break;
            }
        }
        if (!foundCountdownTimer) {
            // remove text on the right which shows time left
            this.operatorWindowCountdownText.innerHTML = "";

            // remove green bar in operator window
            this.operatorWindowCountdownProgress.setAttribute("value", "0");

            // remove red bar in presentation window
            this.presentation.getProgressElementForStateMachine().setAttribute("value", "0");
        }

        //////////////////////////////////////////////////////////////
        //////////////// Handle promise transition ///////////////////
        //////////////////////////////////////////////////////////////
        // Search for the first promise transition.
        for (let i = 0; i < transitionArray.length; i++) {
            const transition = transitionArray[i];
            if (transition.type === "promise") {
                if (transition.guardCondition && !transition.guardCondition()) {
                    continue;
                }
                const thePromise: Promise<void> = transition.functionToGetPromise();
                thePromise.then(
                    () => this.goToState(transition.destination)
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
        // Search for the first if transition.
        for (let i = 0; i < transitionArray.length; i++) {
            const transition = transitionArray[i];
            if (transition.type === "if") {
                if (this.DEBUG) {
                    console.log(`Transition type if: the condition function is ${transition.condition.name}`);
                }
                if (transition.condition()) {
                    if (transition.then.onTransition) {
                        if (this.DEBUG) {
                            console.log(`Running the then.onTransition function of ${this.presentState}: ${transition.then.onTransition.name}`);
                        }
                        transition.then.onTransition();

                    }
                    this.goToState(transition.then.destination, keyboardEvent);
                } else {
                    if (transition.else.onTransition) {
                        if (this.DEBUG) {
                            console.log(`Running the else.onTransitionThen function of ${this.presentState}: ${transition.then.onTransition.name}`);
                        }
                        transition.else.onTransition();

                    }
                    this.goToState(transition.else.destination, keyboardEvent);
                }
            }
            // We could support multiple if transitions, although I have no need to
            break;
        }



    }

    private createCountdownTimerForTransition(timeoutTransition: TimeoutTransition): CountdownTimer {

        const countdownTimer = new CountdownTimer(timeoutTransition.initialDuration);

        countdownTimer.onFinished = () => {
            timeoutTransition.onTransition?.();
            this.goToState(timeoutTransition.destination);
        };

        /*
        Once a team has buzzed and we're waiting for them to answer, we want some special stuff to happen:
        - In the presentation window: the state machine uses a timeout transition, but instead of showing a
            progress bar like what would normally happen for a timeout transition, we want to show it on
            the nine countdown dots.
        - In the operator window: use a second <progress> element, instead of using the same one that shows
            how much time is left for teams to buzz in.
        */
        if (!timeoutTransition.isWaitingForTeamToAnswerAfterBuzz) {
            countdownTimer.addTextElement(this.operatorWindowCountdownText);
            countdownTimer.addProgressElement(this.presentation.getProgressElementForStateMachine());
            countdownTimer.addProgressElement(this.operatorWindowCountdownProgress);
        }


        return countdownTimer;

    }

    private validateStates(): void {

        // Pass one of two: populate the stateMap, and validate the presentation slide names are available.
        this.allStates.forEach((state: StateMachineState) => {
            this.stateMap[state.name] = state;

            if (state.presentationSlideToShow &&
                !this.presentation.allSlideNames.has(state.presentationSlideToShow)) {
                console.warn(`state "${state.name}": showSlide: unknown slide "${state.presentationSlideToShow}"`);
            }

        }, this);

        // Pass two of two: validate all the transitions, and create countdown timers for timeout transitions.
        this.allStates.forEach((state: StateMachineState) => {

            const keyboardKeysUsedInTransitionsFromThisState: { [keyboardKey: string]: number } = {};

            let stateHasTimeoutTransition = false;

            state.transitions.forEach((transition: StateMachineTransition, transitionIndex: number) => {

                // Verify all the destination states exist.
                if (transition.type !== "if") {
                    if (!(transition.destination in this.stateMap)) {
                        printWarning(state.name, transitionIndex,
                            `unknown destination state "${transition.destination}"`);
                    }
                }

                switch (transition.type) {
                    case "keyboard": {
                        // Verify each keyboard key is not used in multiple transitions leaving this state.
                        const keyboardKeys: string = transition.keyboardKeys;
                        for (let i = 0; i < keyboardKeys.length; i++) {
                            const key = keyboardKeys.charAt(i);
                            if (key in keyboardKeysUsedInTransitionsFromThisState) {
                                printWarning(state.name, transitionIndex,
                                    `keyboard key "${key}" was already used in a transition from this state with index ${keyboardKeysUsedInTransitionsFromThisState[key]}`);
                            } else {
                                keyboardKeysUsedInTransitionsFromThisState[key] = transitionIndex;
                            }
                        }

                        break;
                    }

                    case "if": {
                        // Verify destination states exist.
                        if (!(transition.then.destination in this.stateMap)) {
                            printWarning(state.name, transitionIndex,
                                `unknown 'then' state "${transition.then}"`);
                        }
                        if (!(transition.else.destination in this.stateMap)) {
                            printWarning(state.name, transitionIndex,
                                `unknown 'else' state "${transition.else}"`);
                        }
                        break;
                    }

                    // Initialize countdown timers for all timeout transitions.
                    case "timeout": {

                        if (stateHasTimeoutTransition) {
                            printWarning(state.name, transitionIndex,
                                "multiple timeout transitions leaving a state is not supported (because the countdownTimerForState map uses the state name as the key)");
                        }

                        let countdownTimer = this.createCountdownTimerForTransition(transition);

                        // create a progress element in the operator page - probably only needed for debugging
                        this.countdownTimerLeavingState[state.name] = countdownTimer;
                        const tr = document.createElement("tr");

                        const tdStateLabel = document.createElement("td")
                        tdStateLabel.innerHTML = `(${transition.behavior}) ${state.name} &rarr; ${transition.destination} `;
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


                        this.tableOfAllCountdownTimers.appendChild(tr);
                        stateHasTimeoutTransition = true;
                        break;
                    }
                }

                function printWarning(stateName: string, transitionIdx: number, message: string) {
                    console.warn(`state "${stateName}": transition ${transitionIdx}: ${message}`);
                }

            }, this);

        }, this);

    }

    public getAllStates(): StateMachineState[] {
        return this.allStates;
    }

    public getCountdownTimerForState(stateName: string): CountdownTimer {
        return this.countdownTimerLeavingState[stateName];
    }

}
