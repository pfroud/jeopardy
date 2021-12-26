import { StateMachine } from "./StateMachine.js";
import { StateMachineState, TransitionType } from "./stateInterfaces.js";
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
            name: "idle",
            showPresentationSlide: "slide-jeopardy-logo",
            transitions: [{
                type: TransitionType.Manual,
                triggerName: "manualTrigger_startGame",
                dest: "getClueFromJService"
            }]
        }, {
            name: "getClueFromJService",
            showPresentationSlide: "slide-spinner",
            onEnter: operator.getClueFromJService,
            transitions: [{
                type: TransitionType.Promise,
                dest: "showClueCategoryAndDollars"
            }]
        }, {
            /*
            The category and dollar value are shown on the center of the presentation window for a fixed amount of time.
            */
            name: "showClueCategoryAndDollars",
            showPresentationSlide: "slide-clue-category-and-dollars",
            transitions: [{
                type: TransitionType.Timeout,
                duration: settings.displayDurationCategoryMs,
                dest: "showClueQuestion"
            }]
        }, {
            /*
            The clue question is shown on center of the presentation window. The person operating the
            game is supposed to read the question out loud and press space when done reading it.
            Also the category and dollar value are shown on the presentation header.
            */
            name: "showClueQuestion",
            showPresentationSlide: "slide-clue-question",
            onEnter: operator.showClueQuestion,
            transitions: [{
                type: TransitionType.Keyboard,
                keys: " ", //space
                dest: "waitForBuzzesRestartTimer"
            }, {
                type: TransitionType.Keyboard,
                keys: "123456789",
                dest: "showClueQuestion",
                fn: operator.handleLockout
            }]
        }, {
            name: "waitForBuzzesRestartTimer",
            onEnter: operator.handleDoneReadingClueQuestion,
            onExit: stateMachine.saveRemainingCountdownTime,
            transitions: [{
                type: TransitionType.Timeout,
                duration: settings.timeoutWaitForBuzzesMs,
                dest: "showAnswer",
                fn: operator.playSoundQuestionTimeout
            }, {
                type: TransitionType.Keyboard,
                keys: "123456789",
                dest: "checkIfTeamCanAnswer"
            }]
        }, {
            name: "waitForBuzzesResumeTimer",
            onExit: stateMachine.saveRemainingCountdownTime,
            transitions: [{
                type: TransitionType.Timeout,
                duration: () => stateMachine.remainingQuestionTimeMs, //todo look at code implementing stateMachineInstance
                dest: "showAnswer",
                fn: operator.playSoundQuestionTimeout
            }, {
                type: TransitionType.Keyboard,
                keys: "123456789",
                dest: "checkIfTeamCanAnswer"
            }
            ]
        }, {
            name: "checkIfTeamCanAnswer",
            transitions: [{
                type: TransitionType.If,
                condition: operator.canTeamBuzz,
                then: { dest: "waitForTeamAnswer" },
                else: { dest: "waitForBuzzesResumeTimer" }
            }]
        }, {
            name: "waitForTeamAnswer",
            onEnter: operator.handleBuzzerPress,
            transitions: [{
                type: TransitionType.Keyboard,
                keys: "y",
                dest: "showAnswer",
                fn: operator.handleAnswerCorrect
            }, {
                type: TransitionType.Keyboard,
                keys: "n",
                dest: "subtractMoney"
            }, {
                type: TransitionType.Timeout,
                duration: settings.timeoutAnswerMs,
                countdownTimerShowDots: true, // wait what
                dest: "subtractMoney"
            }
            ]
        },
        {
            name: "subtractMoney",
            onEnter: operator.handleAnswerIncorrectOrAnswerTimeout,
            transitions: [{
                type: TransitionType.If,
                condition: operator.haveAllTeamsAnswered,
                then: { dest: "showAnswer" },
                else: { dest: "waitForBuzzesResumeTimer" }
            }]
        }, {
            name: "showAnswer",
            onEnter: operator.handleShowAnswer,
            showPresentationSlide: "slide-clue-answer",
            transitions: [{
                type: TransitionType.Timeout,
                duration: settings.displayDurationAnswerMs,
                dest: "checkGameEnd"
            }]
        }, {
            name: "checkGameEnd",
            transitions: [{
                type: TransitionType.If,
                condition: operator.shouldGameEnd,
                then: { dest: "gameEnd" },
                else: { dest: "getClueFromJService" }
            }]
        }, {
            name: "gameEnd",
            showPresentationSlide: "slide-game-end",
            onEnter: operator.handleGameEnd,
            transitions: [{
                type: TransitionType.Manual,
                triggerName: "manualTrigger_reset",
                dest: "idle"
            }]
        }
    ];

}