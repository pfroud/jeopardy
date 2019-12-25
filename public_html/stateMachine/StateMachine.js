
/* global Function */

class StateMachine {

    constructor(settings, operator, presentation, audioManager) {

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

        this.remainingQuestionTime = -1;

        window.addEventListener("keydown", keyboardEvent => this._handleKeyboardEvent(keyboardEvent));

        this.countdownTimer = null;

        this.currentState = null;

        this.states = getStates(this);
        this._validateStates();

        this.currentState = this.states[0]; //idle state

    }

    _handleKeyboardEvent(keyboardEvent) {
        if (document.activeElement.tagName === "INPUT") {
            return;
        }

        if (this.currentState && !this.operator.isPaused) {
            const transitionArray = this.currentState.transitions;
            for (var i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === "keyboard" && transitionObj.keys.includes(keyboardEvent.key)) {

                    const hasCondition = Boolean(transitionObj.condition);
                    if (hasCondition) {
                        if (transitionObj.condition.call(this.operator, keyboardEvent)) {
                            this._goToState(transitionObj.dest, keyboardEvent);
                        }

                    } else {
                        this._goToState(transitionObj.dest, keyboardEvent);
                    }

                    break;
                }
            }
        }
    }

    setPaused(isPaused) {
        if (this.countdownTimer) {
            if (isPaused) {
                this.countdownTimer.pause();
            } else {
                this.countdownTimer.resume();
            }
        }
    }

    _startCountdown(transitionObj, keyboardEvent) {
        var durationMs;
        var setMax = false;
        if (transitionObj.duration instanceof Function) {
            durationMs = transitionObj.duration();
            setMax = true;
        } else {
            durationMs = transitionObj.duration;
        }


        const destinationStateName = transitionObj.dest;

        var countdownTimer = this.countdownTimer = new CountdownTimer(durationMs, this.audioManager);
        countdownTimer.progressElements.push(this.countdownProgress);
        countdownTimer.textElement.push(this.countdownText);

        if (setMax) {
            const newMax = this.settings.timeoutWaitForBuzzes;
            countdownTimer.maxMs = newMax;

            countdownTimer.progressElements.forEach(elem => elem.attr("max", newMax));

        }

        if (transitionObj.countdownTimerShowDots) {
            const teamIndex = Number(keyboardEvent.key) - 1;
            const teamObj = this.operator.teamArray[teamIndex];
            countdownTimer.dotsElement = teamObj.presentationCountdownDots;
        }

        countdownTimer.onFinished = () => this._goToState(destinationStateName);
        countdownTimer.start();
    }
    
    saveRemainingTime() {
        if (this.countdownTimer) {
            this.remainingQuestionTime = this.countdownTimer.remainingMs;
        }
    }

    manualTrigger(triggerName) {
        if (triggerName in this.manualTriggerMap) {
            const transitionObj = this.manualTriggerMap[triggerName];
            this._goToState(transitionObj.dest);
        } else {
            console.warn(`manual trigger failed: trigger "${triggerName}" not in map of known triggers`);
        }

    }

    _goToState(stateName, paramsToPassToFunctionToCall) {

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

        handleOnExit.call(this);

        this.currentState = this.stateMap[stateName];
        this.divStateName.html(stateName);

        handleShowSlide.call(this);
        handleOnEnter.call(this);
        handleTransitionTimeout.call(this, paramsToPassToFunctionToCall);
        handleTransitionImmedaite.call(this);
        handleTransitionIf.call(this);

        function handleOnExit() {
            if (this.currentState.onExit) {
                const functionToCall = this.currentState.onExit;
                if (!(functionToCall instanceof Function)) {
                    console.info(`state "${this.currentState.name}": cannot call onExit function "${functionToCall}", not a function`);
                    return;
                }
                functionToCall.call(this); //todo fix this, because onEnter always is an operatorInstance call
            }
        }

        function handleTransitionIf() {
            const transitionArray = this.currentState.transitions;
            for (var i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === "if") {
                    if (transitionObj.condition.call(this.operator, paramsToPassToFunctionToCall)) {
                        this._goToState(transitionObj.then, paramsToPassToFunctionToCall);
                    } else {
                        this._goToState(transitionObj.else, paramsToPassToFunctionToCall);
                    }
                }
                break;
            }
        }

        function handleShowSlide() {
            if (this.currentState.showSlide) {
                if (this.presentation.slideNames.includes(this.currentState.showSlide)) {
                    this.presentation.showSlide(this.currentState.showSlide);
                } else {
                    console.warn(`entering state "${this.currentState.name}": can't show slide "${this.currentState.showSlide}", slide not found`);
                }
            }
        }

        function handleOnEnter() {
            if (this.currentState.onEnter) {

                const functionToCall = this.currentState.onEnter;

                if (!(functionToCall instanceof Function)) {
                    console.info(`state "${this.currentState.name}": cannot call onEnter function "${functionToCall}", not a function`);
                    return;
                }

                //todo don't use global reference to operator instnace!
                //todo make this not suck, because onExit call is not an operatorInstance call
                const rv = functionToCall.call(this.operator, paramsToPassToFunctionToCall);

                if (rv && rv.constructor.name === "Promise") {

                    const transitionArray = this.currentState.transitions;
                    for (var i = 0; i < transitionArray.length; i++) {
                        const transitionObj = transitionArray[i];
                        if (transitionObj.type === "promise") {
                            rv.then(
                                    () => this._goToState(transitionObj.dest)
                            ).catch(
                                    returnedByPromise => {
                                        console.warn("promise rejected:");
                                        throw returnedByPromise;
                                    }
                            );
                            break;
                        }
                    }




                }
            }
        }

        //todo rename this startCountdownTimer
        function handleTransitionTimeout(paramsToPassToFunctionToCall) {
            const transitionArray = this.currentState.transitions;
            for (var i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === "timeout") {
                    this._startCountdown(transitionObj, paramsToPassToFunctionToCall);
                    this.divStateName.html(stateName + " &rarr; " + transitionObj.dest);
                    break;
                }
            }
        }

        function handleTransitionImmedaite() {
            const transitionArray = this.currentState.transitions;
            for (var i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === "immediate") {
                    this._goToState(transitionObj.dest);
                    break;
                }
            }
        }
    }

    _validateStates() {

        // pass one of two
        this.states.forEach(function (stateObj, index) {
            this.stateMap[stateObj.name] = stateObj;
            validatePropString("state", index, stateObj, "name");
            validatePropArray("state", index, stateObj, "transitions");

            if (stateObj.showSlide &&
                    !this.presentation.slideNames.includes(stateObj.showSlide)) {
                console.warn(`state "${stateObj.name}": showSlide: unknown slide "${stateObj.showSlide}"`);
            }

        }, this);

        // pass two of two
        this.states.forEach(function (stateObj, stateIndex) {

            var keyboardKeysUsed = {};

            stateObj.transitions.forEach(function (transitionObj, transitionIndex) {

                if (transitionObj.type !== "if") {
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
                    case "timeout":
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

                    case "keyboard":
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
                        for (var i = 0; i < keyboardKeys.length; i++) {
                            const key = keyboardKeys.charAt(i);
                            if (key in keyboardKeysUsed) {
                                printWarning(stateObj.name, transitionIndex,
                                        `keyboard key "${key}" already used in transition ${keyboardKeysUsed[key]}`);
                            } else {
                                keyboardKeysUsed[key] = transitionIndex;
                            }
                        }

                        break;

                    case "manual":
                        this.manualTriggerMap[transitionObj.name] = transitionObj;
                        break;

                    case "promise":
                    case "immediate":
                        // no further validation needed
                        break;

                    case "if":
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
                                `unknown transition type "${transitionObj.type}"`);
                        break;
                }

                function printWarning(stateName, transitionIndex, message) {
                    console.warn(`state "${stateName}": transition ${transitionIndex}: ${message}`);
                }

            }, this);

        }, this);

        function validateProp(name, index, obj, prop, expectedType) {
            if (!prop in obj) {
                console.warn(`${name} at index ${index} does not have property "${prop}"`);
            }
            const theProp = obj[prop];
            const constructorName = theProp.constructor.name;
            if (constructorName !== expectedType) {
                console.warn(`${name} at index ${index}: property "${prop}": type is ${constructorName}, expected ${expectedType}`);
            }
            if (theProp.length < 1) {
                console.warn(`${name} at index ${index} has empty ${prop}`);
            }
        }

        function validatePropString(name, index, obj, prop) {
            validateProp(name, index, obj, prop, "String");
        }
        function validatePropArray(name, index, obj, prop) {
            validateProp(name, index, obj, prop, "Array");
        }


    }

}
