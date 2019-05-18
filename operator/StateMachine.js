/* global pres, operatorInstance */

class StateMachine {

    constructor() {


        this.stateMap = [];

        this.initStates();
        this.validateStates();
        this.state = this.stateMap.idle;
    }

    initStates() {
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
                call: operatorInstance.getClue,
                transitions: [{
                        type: "promise",
                        state: "showCategoryAndDollars"
                    }]
            }, {
                name: "showCategoryAndDollars",
                slide: "preQuestion",
                transitions: [{
                        type: "timeout",
                        duration: 4000, //replace with reference to Settings
                        state: "showQuestion"
                    }]
            }, {
                name: "showQuestion",
                slide: "question",
                transitions: [{
                        type: "keyboard",
                        keys: " ", //space
                        state: "waitForBuzz"
                    }]
            }, {
                name: "waitForBuzz",
                transitions: [{
                        type: "timeout",
                        duration: 10 * 1000, //replace with reference to Settings
                        state: "showAnswer"
                    }, {
                        type: "keyboard",
                        keys: "1234",
                        state: "waitForAnswer",
                        fun: "handleKeyPressed" //something better needs to happen ehre
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
                        type: "immediate",
                        state: "showAnswer",
                        fun: "add the money, somehow"
                    }]
            }, {
                name: "subtractMoney",
                transitions: [{
                        type: "immediate",
                        state: "showAnswer",
                        fun: "add the money, somehow"
                    }]
            }, {
                name: "showAnswer",
                slide: "answer",
                transitions: [{
                        type: "timeout",
                        duration: "1000",
                        slide: "fetchClue"
                    }]
            }
        ];
    }

    _goToState(stateName) {

        if (!(stateName in this.stateMap)) {
            throw new Error(`can't go to state named "$stateName", state not found`);
        }

        this.state = this.stateMap[stateName];
        if (this.state.slide) {
            if (pres.slideNames.includes(this.state.slide)) {
                pres.showSlide(this.state.slide);
            } else {
                throw new Error(`entering state ${this.state.slide.name}: can't present slide ${this.state.slide}, slide not found`);
            }
        }

        if (this.state.call) {

            const rv = this.state.call.call(operatorInstance); //todo make this not suck. need function.call to set value of 'this'

            if (!rv) {
                console.log(`calling method for state ${this.state.name} returned undefined, expected Promise`);
            }
            const constructorName = rv.constructor.name;
            if (constructorName !== "Promise") {
                console.log(`calling method for state ${this.state.name} returned ${constructorName}, expected Promise`);
            }

            // TODO make this search the array of transitions
            if (this.state.transitions[0].type === "promise") {
                rv.then(returnedByPromise => {
                    console.log("returned by promise:");
                    console.log(returnedByPromise);
                    this._goToState(this.state.transitions[0].state);
                });
            }

        }
    }

    validateStates() {

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

                if (!(transitionObj.state in this.stateMap)) {
                    console.log(`state "${stateObj.name}": transition ${transitionIndex}: unknown destination state "${transitionObj.state}"`);
                }

                switch (transitionObj.type) {
                    case "timeout":
                        break;
                    case "keyboard":
                        break;
                    case "manual":
                        this[transitionObj.name] = () => this._goToState(transitionObj.state);
                        break;
                    case "immediate":
                        break;
                    case "promise":
                        break;
                    default:
                        console.log(`state "${stateObj.name}": transition ${transitionIndex}: unknown type "${transitionObj.type}"`);
                        break;

                }


            }, this);

        }, this);




    }

}
