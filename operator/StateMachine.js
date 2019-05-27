/* global pres, operatorInstance */

class StateMachine {

    constructor() {

        this.countdownProgress = $("div#state-machine-viz progress#countdown");
        this.countdownText = $("div#state-machine-viz div#remaining");
        this.divStateName = $("div#state-machine-viz div#state-name");

        this.stateMap = {};
        this.manualTriggerMap = {};

        this._initStates();
        this._validateStates();

        this._goToState("idle");

//        this.state = this.stateMap.idle;
    }

    _startCountdown(durationMs, destinationStateName) {
        const countdownTimer = new CountdownTimer(durationMs);
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
                transitions: [{
                        type: "keyboard",
                        keys: " ", //space
                        state: "waitForBuzz"
                    }]
            }, {
                name: "waitForBuzz",
                transitions: [{
                        type: "timeout",
                        duration: 10 * 1000, //todo replace with reference to Settings
                        state: "showAnswer"
                    }, {
                        type: "keyboard",
                        keys: "1234",
                        state: "waitForAnswer",
                        fun: "handleKeyPressed" //todo something better needs to happen here
                    }]
            }, {
                name: "waitForAnswer",
                transitions: [{
                        type: "keyboard",
                        keys: "y",
                        state: "addMoney"
                    }, {
                        type: "keyboard",
                        keys: "n",
                        state: "subtractMoney"
                    }]
            }, {
                name: "addMoney",
                transitions: [{
                        type: "promise",
                        state: "showAnswer",
                        fun: "add the money, somehow"
                    }]
            }, {
                name: "subtractMoney",
                transitions: [{
                        type: "promise",
                        state: "showAnswer",
                        fun: "add the money, somehow"
                    }]
            }, {
                name: "showAnswer",
                slide: "clueAnswer",
                transitions: [{
                        type: "timeout",
                        duration: 1000,
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

    _goToState(stateName) {

        if (!(stateName in this.stateMap)) {
            throw new Error(`can't go to state named "${stateName}", state not found`);
        }

        this.state = this.stateMap[stateName];

        this.divStateName.html(stateName);

        handleSlide.call(this);
        handleOnEnter.call(this);
        handleTimeoutTransition.call(this);

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
                const rv = functionToCall.call(operatorInstance); //todo don't use global reference to operator instnace!

                if (!rv) {
                    console.log(`calling method for state ${this.state.name} returned void, expected Promise`);
                }
                const constructorName = rv.constructor.name;
                if (constructorName !== "Promise") {
                    console.log(`calling method for state ${this.state.name} returned ${constructorName}, expected Promise`);
                }

                // TODO make this search the array of transitions instead of always using index zero
                if (this.state.transitions[0].type === "promise") {
                    rv.then(
                            () => this._goToState(this.state.transitions[0].state)
                    ).catch(
                            returnedByPromise => {
                                console.warn("promise rejected:");
                                throw returnedByPromise;
                            }
                    );
                } else {
                    // not sure what to do
                }
            }
        }

        function handleTimeoutTransition() {
            // todo make this search for timeout transition instead of using index zero
            const transitionZero = this.state.transitions[0];
            if (transitionZero.type === "timeout") {
                this._startCountdown(transitionZero.duration, transitionZero.state);
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
