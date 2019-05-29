/* global pres, operatorInstance, Function */

class StateMachine {

    constructor() {

        this.DEBUG = true;

        this.countdownProgress = $("div#state-machine-viz progress#countdown");
        this.countdownText = $("div#state-machine-viz div#remaining");
        this.divStateName = $("div#state-machine-viz div#state-name");

        this.stateMap = {};
        this.manualTriggerMap = {};

        window.addEventListener("keydown", keyboardEvent => this._handleKeyboardEvent(keyboardEvent));

        this.countdownTimer = null;

        this._initStates();
        this._validateStates();

        this._goToState("idle");

//        this.state = this.stateMap.idle;
    }

    _handleKeyboardEvent(keyboardEvent) {
        const transitionArray = this.state.transitions;
        for (var i = 0; i < transitionArray.length; i++) {
            const transitionObj = transitionArray[i];
            if (transitionObj.type === "keyboard" && transitionObj.keys.includes(keyboardEvent.key)) {

                const hasCondition = Boolean(transitionObj.condition);
                if (hasCondition) {
                    if (transitionObj.condition.call(operatorInstance, keyboardEvent)) {
                        this._goToState(transitionObj.state, keyboardEvent);
                    }
                    
                } else {
                    this._goToState(transitionObj.state, keyboardEvent);
                }

                break;
            }
        }
    }

    _startCountdown(transitionObj) {
        const durationMs = transitionObj.duration;
        const destinationStateName = transitionObj.state;

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
                        state: "fetchClue"
                    }]
            }, {
                name: "fetchClue",
                slide: "spinner",
                onEnter: operatorInstance.getClue,
                transitions: [{
                        type: "promise",
                        state: "showCategoryAndDollars"
                    }]
            }, {
                name: "showCategoryAndDollars",
                slide: "preQuestion",
                transitions: [{
                        type: "timeout",
                        duration: 4000, //todo replace with reference to Settings
                        state: "showQuestion"
                    }]
            }, {
                name: "showQuestion",
                slide: "clueQuestion",
                onEnter: operatorInstance.showClueQuestion,
                transitions: [{
                        type: "keyboard",
                        keys: " ", //space
                        state: "waitForBuzzes"
                    }]
            }, {
                name: "waitForBuzzes",
                onEnter: operatorInstance.handleDoneReadingClueQuestionNew,
                transitions: [{
                        type: "timeout",
                        duration: 10 * 1000, //todo replace with reference to Settings
                        state: "showAnswer"
                    }, {
                        type: "keyboard",
                        condition: operatorInstance.canTeamBuzz,
                        keys: "1234",
                        state: "waitForTeamAnswer"
                    }]
            }, {
                name: "waitForTeamAnswer",
                onEnter: operatorInstance.handleBuzzerPressNew,
                transitions: [{
                        type: "keyboard",
                        keys: "y",
                        state: "addMoney"
                    }, {
                        type: "keyboard",
                        keys: "n",
                        state: "subtractMoney"
                    }, {
                        type: "timeout",
                        duration: 3000, //todo replace with refrence to settings
                        state: "subtractMoney"
                    }
                ]
            }, {
                name: "addMoney",
                onEnter: operatorInstance.handleAnswerRight,
                transitions: [{
                        type: "promise",
                        state: "showAnswer"
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
                slide: "clueAnswer",
                transitions: [{
                        type: "timeout",
                        duration: 2000,
                        state: "fetchClue"
                    }]
            }
        ];
    }

    manualTrigger(triggerName) {
        if (triggerName in this.manualTriggerMap) {
            const transitionObj = this.manualTriggerMap[triggerName];
            this._goToState(transitionObj.state);
        } else {
            console.warn(`manual trigger failed: trigger "${triggerName}" not in map of known triggers`);
        }

    }

    _goToState(stateName, paramsToPassToFunctionToCall) {

        if (!(stateName in this.stateMap)) {
            throw new Error(`can't go to state named "${stateName}", state not found`);
        }

        if (this.countdownTimer) {
            this.countdownTimer.pause();
        }

        if(this.DEBUG){
            console.log(`going to state "${stateName}"`);
        }

        this.state = this.stateMap[stateName];
        this.divStateName.html(stateName);

        handleSlide.call(this);
        handleOnEnter.call(this);
        handleTimeoutTransition.call(this);

        const transitionZero = this.state.transitions[0];
        if (transitionZero.type === "if") {
            if (transitionZero.condition.call(operatorInstance, paramsToPassToFunctionToCall)) {
                this._goToState(transitionZero.then);
            } else {
                this._goToState(transitionZero.else);
            }
        }

        function handleSlide() {
            if (this.state.slide) {
                if (pres.slideNames.includes(this.state.slide)) {
                    pres.showSlide(this.state.slide);
                } else {
                    console.warn(`entering state "${this.state.name}": can't present slide "${this.state.slide}", slide not found`);
                }
            }
        }

        function handleOnEnter() {
            if (this.state.onEnter) {

                const functionToCall = this.state.onEnter;

                if (!(functionToCall instanceof Function)) {
                    console.info(`state "${this.state.name}": cannot call onEnter function "${functionToCall}", not a function`);
                    return;
                }

                //todo don't use global reference to operator instnace!
                const rv = functionToCall.call(operatorInstance, paramsToPassToFunctionToCall);

                if (rv && rv.constructor.name === "Promise") {

                    const transitionArray = this.state.transitions;
                    for (var i = 0; i < transitionArray.length; i++) {
                        const transitionObj = transitionArray[i];
                        if (transitionObj.type === "promise") {
                            rv.then(
                                    () => this._goToState(transitionObj.state)
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
            const transitionArray = this.state.transitions;
            for (var i = 0; i < transitionArray.length; i++) {
                const transitionObj = transitionArray[i];
                if (transitionObj.type === "timeout") {
                    this._startCountdown(transitionObj);
                    this.divStateName.html(stateName + " &rarr; " + transitionObj.state);
                    break;
                }
            }
        }
    }

    _validateStates() {

        function validateProp(name, index, obj, prop, expectedType) {
            if (!prop in obj) {
                console.log(`${name} at index ${index} does not have property "${prop}"`);
            }
            const theProp = obj[prop];
            const constructorName = theProp.constructor.name;
            if (constructorName !== expectedType) {
                console.log(`${name} at index ${index}: property "${prop}": type is ${constructorName}, expected ${expectedType}`);
            }
            if (theProp.length < 1) {
                console.log(`${name} at index ${index} has empty ${prop}`);
            }
        }

        function validatePropString(name, index, obj, prop) {
            validateProp(name, index, obj, prop, "String");
        }
        function validatePropArray(name, index, obj, prop) {
            validateProp(name, index, obj, prop, "Array");
        }


        // pass one of two
        this.states.forEach(function (stateObj, index) {
            this.stateMap[stateObj.name] = stateObj;
            validatePropString("state", index, stateObj, "name");
            validatePropArray("state", index, stateObj, "transitions");
        }, this);

        // pass two of two
        this.states.forEach(function (stateObj, stateIndex) {
            stateObj.transitions.forEach(function (transitionObj, transitionIndex) {

                if (!transitionObj.state) {
                    printWarning(stateObj.name, transitionIndex,
                            "no destination state");
                    return;
                }

                if (!(transitionObj.state in this.stateMap)) {
                    printWarning(stateObj.name, transitionIndex,
                            `unknown destination state "${transitionObj.state}"`);
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
                        // todo validate no keys are in multiple transitions
                        break;

                    case "manual":
                        this.manualTriggerMap[transitionObj.name] = transitionObj;
                        break;

                    case "immediate":
                        printWarning(stateObj.name, transitionIndex,
                                "replace transition type immediate with promise");
                        break;

                    case "promise":
                        // no further validation needed
                        break;

                    case "if":
                        //todo add validation
                        break;

                    default:
                        printWarning(stateObj.name, transitionIndex,
                                `unknown transition type "${transitionObj.type}"`);
                        break;

                }


                function printWarning(stateName, transitionIndex, message) {
                    console.log(`state "${stateName}": transition ${transitionIndex}: ${message}`);
                }

            }, this);

        }, this);




    }

}
