import { StateMachine } from "./StateMachine";

function getStates(stateMachineInstance: StateMachine) {

    // todo make names of states less confusing
    //todo consider adding a way to call function on a transition, instead of having init and continuing states
    // todo simplify onEnter and onExit
    /*
     * where to replace two states with one state and onTransition:
     * definitley: showQuestion(Init)
     * maybe: waitForBuzzes{restartTime,resumeTimer}
     *      yeah just have resumeTime be default, then call restartTime when coming from showQuestion press space
     */

    return [
        {
            name: "idle",
            showSlide: "jeopardy-logo",
            transitions: [{
                    type: "manual",
                    name: "startGame",
                    dest: "fetchClue"
                }]
        }, {
            name: "fetchClue",
            showSlide: "spinner",
            onEnter: stateMachineInstance.operator.getClue,
            transitions: [{
                    type: "promise",
                    dest: "showCategoryAndDollars"
                }]
        }, {
            name: "showCategoryAndDollars",
            showSlide: "clue-category-and-dollars",
            transitions: [{
                    type: "timeout",
                    duration: stateMachineInstance.settings.displayDurationCategoryMs,
                    dest: "showQuestionInit"
                }]
        }, {
            name: "showQuestionInit",
            showSlide: "clue-question",
            onEnter: stateMachineInstance.operator.showClueQuestion,
            transitions: [{
                    type: "immediate",
                    dest: "showQuestion"
                }]
        }, {
            name: "showQuestion",
            transitions: [{
                    type: "keyboard",
                    keys: " ", //space
                    dest: "waitForBuzzesRestartTimer"
                }, {
                    type: "keyboard",
                    keys: "123456789",
                    dest: "lockout"
                }]
        }, {
            name: "lockout",
            onEnter: stateMachineInstance.operator.handleLockout,
            transitions: [{
                    type: "immediate",
                    dest: "showQuestion"
                }]
        }, {
            name: "waitForBuzzesRestartTimer",
            onEnter: stateMachineInstance.operator.handleDoneReadingClueQuestion,
            onExit: stateMachineInstance.saveRemainingTime,
            transitions: [{
                    type: "timeout",
                    duration: stateMachineInstance.settings.timeoutWaitForBuzzesMs,
                    dest: "playTimeoutSound"
                }, {
                    type: "keyboard",
                    keys: "123456789",
                    dest: "tryTeamAnswer"
                }]
        }, {
            name: "waitForBuzzesResumeTimer",
            onExit: stateMachineInstance.saveRemainingTime,
            transitions: [{
                    type: "timeout",
                    duration: () => stateMachineInstance.remainingQuestionTime, //todo look at code implementing stateMachineInstance
                    dest: "playTimeoutSound"
                }, {
                    type: "keyboard",
                    keys: "123456789",
                    dest: "tryTeamAnswer"
                }
            ]
        }, {
            name: "tryTeamAnswer",
            transitions: [{
                    type: "if",
                    condition: stateMachineInstance.operator.canTeamBuzz,
                    then: "waitForTeamAnswer",
                    else: "waitForBuzzesResumeTimer"
                }]
        }, {
            name: "waitForTeamAnswer",
            onEnter: stateMachineInstance.operator.handleBuzzerPress,
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
                    duration: stateMachineInstance.settings.timeoutAnswerMs,
                    countdownTimerShowDots: true,
                    dest: "subtractMoney"
                }
            ]
        }, {
            name: "addMoney",
            onEnter: stateMachineInstance.operator.handleAnswerRight,
            transitions: [{
                    type: "immediate",
                    dest: "showAnswer"
                }]
        }, {
            name: "subtractMoney",
            onEnter: stateMachineInstance.operator.handleAnswerWrong,
            transitions: [{
                    type: "if",
                    condition: stateMachineInstance.operator.haveAllTeamsAnswered,
                    then: "showAnswer",
                    else: "waitForBuzzesResumeTimer"
                }]
        }, {
            name: "playTimeoutSound",
            onEnter: stateMachineInstance.operator.playTimeoutSound,
            transitions: [{
                    type: "immediate",
                    dest: "showAnswer"
                }]
        },
        {
            name: "showAnswer",
            onEnter: stateMachineInstance.operator.handleShowAnswer,
            showSlide: "clue-answer",
            transitions: [{
                    type: "timeout",
                    duration: stateMachineInstance.settings.displayDurationAnswerMs,
                    dest: "checkGameEnd"
                }]
        }, {
            name: "checkGameEnd",
            transitions: [{
                    type: "if",
                    condition: stateMachineInstance.operator.shouldGameEnd,
                    then: "gameEnd",
                    else: "fetchClue"
                }]
        }, {
            name: "gameEnd",
            showSlide: "game-end",
            onEnter: stateMachineInstance.operator.handleGameEnd,
            transitions: [{
                    type: "manual",
                    name: "reset",
                    dest: "idle"
                }]
        }
    ];

}