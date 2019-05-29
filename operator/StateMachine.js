/* global pres, operatorInstance, Function, SETTINGS */

class StateMachine {

    constructor() {

        this.DEBUG = false;
        
        this.countdownProgress = $("div#state-machine-viz progress#countdown");
        this.countdownText = $("div#state-machine-viz div#remaining");
        this.divStateName = $("div#state-machine-viz div#state-name");

        this.stateMap = {};
        this.manualTriggerMap = {};

        window.addEventListener("keydown", keyboardEvent => this._handleKeyboardEvent(keyboardEvent));

        this.countdownTimer = null;

        this.currentState = null;

        this._initStates();
        this._validateStates();

        this._goToState("idle");
    }

    _handleKeyboardEvent(keyboardEvent) {
        const transitionArray = this.currentState.transitions;
        for (var i = 0; i < transitionArray.length; i++) {
            const transitionObj = transitionArray[i];
            if (transitionObj.type === "keyboard" && transitionObj.keys.includes(keyboardEvent.key)) {

                const hasCondition = Boolean(transitionObj.condition);
                if (hasCondition) {
                    if (transitionObj.condition.call(operatorInstance, keyboardEvent)) {
                        this._goToState(transitionObj.dest, keyboardEvent);
                    }

                } else {
                    this._goToState(transitionObj.dest, keyboardEvent);
                }

                break;
            }
        }
    }

    _startCountdown(transitionObj) {
        const durationMs = transitionObj.duration;
        const destinationStateName = transitionObj.dest;

        var countdownTimer = this.countdownTimer = new CountdownTimer(durationMs);
        countdownTimer.progressElement = this.countdownProgress;
        countdownTimer.textElement = this.countdownText;
        countdownTimer.onFinished = () => this._goToState(destinationStateName);
        countdownTimer.start();
    }

    _initStates() {
        this.states = [
            {
                name: "idle",
                transitions: [{
                        type: "manual",
                        name: "startGame",
                        dest: "fetchClue"
                    }]
            }, {
                name: "fetchClue",
                showSlide: "spinner",
                onEnter: operatorInstance.getClue,
                transitions: [{
                        type: "promise",
                        dest: "showCategoryAndDollars"
                    }]
            }, {
                name: "showCategoryAndDollars",
                showSlide: "pre-question",
                transitions: [{
                        type: "timeout",
                        duration: SETTINGS.displayDurationCategory,
                        dest: "showQuestion"
                    }]
            }, {
                name: "showQuestion",
                showSlide: "clue-question",
                onEnter: operatorInstance.showClueQuestion,
                transitions: [{
                        type: "keyboard",
                        keys: " ", //space
                        dest: "waitForBuzzes"
                    }]
            }, {
                name: "waitForBuzzes",
                onEnter: operatorInstance.handleDoneReadingClueQuestionNew,
                transitions: [{
                        type: "timeout",
                        duration: SETTINGS.questionTimeout,
                        dest: "showAnswer"
                    }, {
                        type: "keyboard",
                        condition: operatorInstance.canTeamBuzz,
                        keys: "1234",
                        dest: "waitForTeamAnswer"
                    }]
            }, {
                name: "waitForTeamAnswer",
                onEnter: operatorInstance.handleBuzzerPressNew,
                transitions: [{
                        type: "keyboard",
                        keys: "y",
                        dest: "addMoney"
                    }, {
                        type: "keyboard",
                        keys: "n",
                        dest: "subtractMoney"
                    }, {
                        type: "timeout",
                        duration: SETTINGS.answerTimeout,
                        dest: "subtractMoney"
                    }
                ]
            }, {
                name: "addMoney",
                onEnter: operatorInstance.handleAnswerRight,
                transitions: [{
                        type: "promise",
                        dest: "showAnswer"
                    }]
            }, {
                name: "subtractMoney",
                onEnter: operatorInstance.handleAnswerWrong,
                transitions: [{
                        type: "if",
                        condition: operatorInstance.haveAllTeamsAnswered,
                        then: "showAnswer",
                        else: "waitForBuzzes"
                    }]
            }, {
                name: "showAnswer",
                showSlide: "clue-answer",
                transitions: [{
                        type: "timeout",
                        duration: 2000,
                        dest: "fetchClue"
                    }]
            }
        ];
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
        }

        if (this.DEBUG) {
            console.log(`going to state "${stateName}"`);
        }

        this.currentState = this.stateMap[stateName];
        this.divStateName.html(stateName);

        handleSlide.call(this);
        handleOnEnter.call(this);
        handleTimeoutTransition.call(this);

        const transitionZero = this.currentState.transitions[0];
        if (transitionZero.type === "if") {
            if (transitionZero.condition.call(operatorInstance, paramsToPassToFunctionToCall)) {
                this._goToState(transitionZero.then);
            } else {
                this._goToState(transitionZero.else);
            }
        }

        function handleSlide() {
            if (this.currentState.showSlide) {
                if (pres.slideNames.includes(this.currentState.showSlide)) {
                    pres.showSlide(this.currentState.showSlide);
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
                const rv = functionToCall.call(operatorInstance, paramsToPassToFunctionToCall);

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

        function handleTimeoutTransition() {
            const transitionArray = this.currentState.transitions;
            for (var i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === "timeout") {
                    this._startCountdown(transitionObj);
                    this.divStateName.html(stateName + " &rarr; " + transitionObj.dest);
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
        }, this);

        // pass two of two
        this.states.forEach(function (stateObj, stateIndex) {

            var keysUsed = {};

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
                        if (!Number.isInteger(duration)) {
                            printWarning(stateObj.name, transitionIndex,
                                    `duration for timeout transition is not an integer: ${duration}`);
                        }
                        break;

                    case "keyboard":
                        const keys = transitionObj.keys;
                        if (!keys) {
                            printWarning(stateObj.name, transitionIndex,
                                    `no keys for keyboard transition`);
                        }

                        if (keys.constructor.name !== "String") {
                            printWarning(stateObj.name, transitionIndex,
                                    `property keys has type ${keys.constructor.name}, expected String`);
                        }

                        for (var i = 0; i < keys.length; i++) {
                            const key = keys.charAt(i);
                            if (key in keysUsed) {
                                printWarning(stateObj.name, transitionIndex,
                                        `keyboard key "${key}" already used in transition ${keysUsed[key]}`);
                            } else {
                                keysUsed[key] = transitionIndex;
                            }
                        }

                        break;

                    case "manual":
                        this.manualTriggerMap[transitionObj.name] = transitionObj;
                        break;

                    case "promise":
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
