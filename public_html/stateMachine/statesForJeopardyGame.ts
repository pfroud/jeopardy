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
            presentationSlideToShow: "slide-jeopardy-logo",
            transitions: [{
                type: TransitionType.ManualTrigger,
                triggerName: "startGame",
                destination: "getClueFromJService"
            }]
        }, {
            name: "getClueFromJService",
            presentationSlideToShow: "slide-spinner",
            onEnter: operator.getClueFromJService,
            transitions: [{
                type: TransitionType.Promise,
                destination: "showClueCategoryAndDollars"
            }]
        }, {
            /*
            The category and dollar value are shown on the center of the presentation window for a fixed amount of time.
            */
            name: "showClueCategoryAndDollars",
            presentationSlideToShow: "slide-clue-category-and-dollars",
            transitions: [{
                type: TransitionType.Timeout,
                duration: settings.displayDurationCategoryMs,
                destination: "showClueQuestion"
            }]
        }, {
            /*
            The clue question is shown on center of the presentation window. The person operating the
            game is supposed to read the question out loud and press space when done reading it.
            Also the category and dollar value are shown on the presentation header.
            */
            name: "showClueQuestion",
            presentationSlideToShow: "slide-clue-question",
            onEnter: operator.showClueQuestion,
            transitions: [{
                type: TransitionType.Keyboard,
                keyboardKeys: " ", //space
                destination: "waitForBuzzesRestartTimer"
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "123456789",
                destination: "showClueQuestion",
                fn: operator.handleLockout
            }]
        }, {
            name: "waitForBuzzesRestartTimer",
            onEnter: operator.handleDoneReadingClueQuestion,
            onExit: stateMachine.saveRemainingCountdownTime,
            transitions: [{
                type: TransitionType.Timeout,
                duration: settings.timeoutWaitForBuzzesMs,
                destination: "showAnswer",
                fn: operator.playSoundQuestionTimeout
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "123456789",
                destination: "checkIfTeamCanAnswer"
            }]
        }, {
            name: "waitForBuzzesResumeTimer",
            onExit: stateMachine.saveRemainingCountdownTime,
            transitions: [{
                type: TransitionType.Timeout,
                duration: () => stateMachine.remainingQuestionTimeMs, //todo look at code implementing stateMachineInstance
                destination: "showAnswer",
                fn: operator.playSoundQuestionTimeout
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "123456789",
                destination: "checkIfTeamCanAnswer"
            }
            ]
        }, {
            name: "checkIfTeamCanAnswer",
            transitions: [{
                type: TransitionType.If,
                condition: operator.canTeamBuzz,
                then: { destination: "waitForTeamAnswer" },
                else: { destination: "waitForBuzzesResumeTimer" }
            }]
        }, {
            name: "waitForTeamAnswer",
            onEnter: operator.handleBuzzerPress,
            transitions: [{
                type: TransitionType.Keyboard,
                keyboardKeys: "y",
                destination: "showAnswer",
                fn: operator.handleAnswerCorrect
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "n",
                destination: "subtractMoney"
            }, {
                type: TransitionType.Timeout,
                duration: settings.timeoutAnswerMs,
                countdownTimerShowDots: true, // wait what
                destination: "subtractMoney"
            }
            ]
        },
        {
            name: "subtractMoney",
            onEnter: operator.handleAnswerIncorrectOrAnswerTimeout,
            transitions: [{
                type: TransitionType.If,
                condition: operator.haveAllTeamsAnswered,
                then: { destination: "showAnswer" },
                else: { destination: "waitForBuzzesResumeTimer" }
            }]
        }, {
            name: "showAnswer",
            onEnter: operator.handleShowAnswer,
            presentationSlideToShow: "slide-clue-answer",
            transitions: [{
                type: TransitionType.Timeout,
                duration: settings.displayDurationAnswerMs,
                destination: "checkGameEnd"
            }]
        }, {
            name: "checkGameEnd",
            transitions: [{
                type: TransitionType.If,
                condition: operator.shouldGameEnd,
                then: { destination: "gameEnd" },
                else: { destination: "getClueFromJService" }
            }]
        }, {
            name: "gameEnd",
            presentationSlideToShow: "slide-game-end",
            onEnter: operator.handleGameEnd,
            transitions: [{
                type: TransitionType.ManualTrigger,
                triggerName: "manualTrigger_reset",
                destination: "idle"
            }]
        }
    ];

}