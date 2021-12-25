import { StateMachine } from "./StateMachine.js";
import {StateMachineState, TransitionType} from "./stateInterfaces.js";
import { Operator } from "../operator/Operator.js";
import { Settings } from "../Settings.js";

export function getStatesForJeopardyGame(stateMachine: StateMachine, operator: Operator, settings: Settings): StateMachineState[] {

    /*
     * where to replace two states with one state and onTransition:
     * definitley: showQuestion(Init)
     * maybe: waitForBuzzes{restartTime,resumeTimer}
     *      yeah just have resumeTime be default, then call restartTime when coming from showQuestion press space
     */

    return [
        {
            name: "state_idle",
            showPresentationSlide: "slide-jeopardy-logo",
            transitions: [{
                    type: TransitionType.Manual,
                    triggerName: "manualTrigger_startGame",
                    dest: "state_getClueFromJService"
                }]
        }, {
            name: "state_getClueFromJService",
            showPresentationSlide: "slide-spinner",
            onEnter: operator.getClueFromJService,
            transitions: [{
                    type: TransitionType.Promise,
                    dest: "state_showClueCategoryAndDollars"
                }]
        }, {
            /*
            The category and dollar value are shown on the center of the presentation window for a fixed amount of time.
            */
            name: "state_showClueCategoryAndDollars",
            showPresentationSlide: "slide-clue-category-and-dollars",
            transitions: [{
                    type: TransitionType.Timeout,
                    duration: settings.displayDurationCategoryMs,
                    dest: "state_showClueQuestion"
                }]
        }, {
            /*
            The clue question is shown on center of the presentation window. The person operating the
            game is supposed to read the question out loud and press space when done reading it.
            Also the category and dollar value are shown on the presentation header.
            */
            name: "state_showClueQuestion",
            showPresentationSlide: "slide-clue-question",
            onEnter: operator.showClueQuestion,
            transitions: [{
                    type: TransitionType.Keyboard,
                    keys: " ", //space
                    dest: "state_waitForBuzzesRestartTimer"
                }, {
                    type: TransitionType.Keyboard,
                    keys: "123456789",
                    dest: "state_showClueQuestion",
                    fn: operator.handleLockout
                }]
        }, {
            name: "state_waitForBuzzesRestartTimer",
            onEnter: operator.handleDoneReadingClueQuestion,
            onExit: stateMachine.saveRemainingCountdownTime,
            transitions: [{
                    type: TransitionType.Timeout,
                    duration: settings.timeoutWaitForBuzzesMs,
                    dest: "state_showAnswer",
                    fn: operator.playSoundQuestionTimeout
                }, {
                    type: TransitionType.Keyboard,
                    keys: "123456789",
                    dest: "state_checkIfTeamCanAnswer"
                }]
        }, {
            name: "state_waitForBuzzesResumeTimer",
            onExit: stateMachine.saveRemainingCountdownTime,
            transitions: [{
                    type: TransitionType.Timeout,
                    duration: () => stateMachine.remainingQuestionTimeMs, //todo look at code implementing stateMachineInstance
                    dest: "state_showAnswer",
                    fn: operator.playSoundQuestionTimeout
                }, {
                    type: TransitionType.Keyboard,
                    keys: "123456789",
                    dest: "state_checkIfTeamCanAnswer"
                }
            ]
        }, {
            name: "state_checkIfTeamCanAnswer",
            transitions: [{
                    type: TransitionType.If,
                    condition: operator.canTeamBuzz,
                    then: {dest: "state_waitForTeamAnswer"},
                    else: {dest: "state_waitForBuzzesResumeTimer"}
                }]
        }, {
            name: "state_waitForTeamAnswer",
            onEnter: operator.handleBuzzerPress,
            transitions: [{
                    type: TransitionType.Keyboard,
                    keys: "y",
                    dest: "state_showAnswer",
                    fn: operator.handleAnswerCorrect
                }, {
                    type: TransitionType.Keyboard,
                    keys: "n",
                    dest: "state_subtractMoney"
                }, {
                    type: TransitionType.Timeout,
                    duration: settings.timeoutAnswerMs,
                    countdownTimerShowDots: true, // wait what
                    dest: "state_subtractMoney"
                }
            ]
        },
        {
            name: "state_subtractMoney",
            onEnter: operator.handleAnswerIncorrectOrAnswerTimeout,
            transitions: [{
                    type: TransitionType.If,
                    condition: operator.haveAllTeamsAnswered,
                    then: {dest: "state_showAnswer"},
                    else: {dest: "state_waitForBuzzesResumeTimer"}
                }]
        }, {
            name: "state_showAnswer",
            onEnter: operator.handleShowAnswer,
            showPresentationSlide: "slide-clue-answer",
            transitions: [{
                    type: TransitionType.Timeout,
                    duration: settings.displayDurationAnswerMs,
                    dest: "state_checkGameEnd"
                }]
        }, {
            name: "state_checkGameEnd",
            transitions: [{
                    type: TransitionType.If,
                    condition: operator.shouldGameEnd,
                    then: {dest: "state_gameEnd"},
                    else: {dest: "state_getClueFromJService"}
                }]
        }, {
            name: "state_gameEnd",
            showPresentationSlide: "slide-game-end",
            onEnter: operator.handleGameEnd,
            transitions: [{
                    type: TransitionType.Manual,
                    triggerName: "manualTrigger_reset",
                    dest: "state_idle"
                }]
        }
    ];

}