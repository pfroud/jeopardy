import { StateMachine } from "./StateMachine.js";
import { StateMachineState, TransitionType } from "./stateInterfaces.js";
import { Operator } from "../operator/Operator.js";
import { Settings } from "../Settings.js";

export function getStatesForJeopardyGame(stateMachine: StateMachine, operator: Operator, settings: Settings): StateMachineState[] {

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
            transitions: [{
                type: TransitionType.Promise,
                /*
                The promise only tells the state machine when to go to the next state.
                The promise does NOT pass the clue object to the state machine.
                The clue object is only stored by the operator.
                */
                functionToGetPromise: operator.getClueFromJService.bind(operator),
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
                //countdownTimerProgressElementGroup: "shared",
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
            onEnter: operator.showClueQuestion.bind(operator),
            transitions: [{
                type: TransitionType.Keyboard,
                keyboardKeys: " ", //space
                destination: "waitForBuzzes"
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "123456789",
                destination: "showClueQuestion",
                fn: operator.handleLockout.bind(operator)
            }]
        }, {
            name: "waitForBuzzes",
            onEnter: operator.handleDoneReadingClueQuestion.bind(operator),
            //onExit: stateMachine.saveRemainingCountdownTime.bind(stateMachine),
            transitions: [{
                type: TransitionType.Timeout,
                duration: settings.timeoutWaitForBuzzesMs,
                //countdownTimerProgressElementGroup: "shared",
                destination: "showAnswer",
                fn: operator.playSoundQuestionTimeout.bind(operator)
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "123456789",
                destination: "checkIfTeamCanAnswer"
            }]
            /*
        }, {
            name: "waitForBuzzesResumeTimer",
            onExit: stateMachine.saveRemainingCountdownTime,
            transitions: [{
                type: TransitionType.Timeout,
                duration: () => stateMachine.remainingQuestionTimeMs, //todo look at code implementing stateMachineInstance
                countdownTimerProgressElementGroup: "shared",
                destination: "showAnswer",
                fn: operator.playSoundQuestionTimeout.bind(operator)
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "123456789",
                destination: "checkIfTeamCanAnswer"
            }]
            */
        }, {
            name: "checkIfTeamCanAnswer",
            transitions: [{
                type: TransitionType.If,
                condition: operator.canTeamBuzz.bind(operator),
                then: { destination: "waitForTeamAnswer" },
                else: { destination: "waitForBuzzes" }
            }]
        }, {
            name: "waitForTeamAnswer",
            onEnter: operator.handleBuzzerPress.bind(operator),
            transitions: [{
                type: TransitionType.Keyboard,
                keyboardKeys: "y",
                destination: "showAnswer",
                fn: operator.handleAnswerCorrect.bind(operator)
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "n",
                destination: "subtractMoney"
            }, {
                type: TransitionType.Timeout,
                duration: settings.timeoutAnswerMs,
                //countdownTimerProgressElementGroup: "waiting-for-answer",
                countdownTimerShowDots: true, // wait what
                destination: "subtractMoney"
            }
            ]
        },
        {
            name: "subtractMoney",
            onEnter: operator.handleAnswerIncorrectOrAnswerTimeout.bind(operator),
            transitions: [{
                type: TransitionType.If,
                condition: operator.haveAllTeamsAnswered.bind(operator),
                then: { destination: "showAnswer" },
                else: { destination: "waitForBuzzes" }
            }]
        }, {
            name: "showAnswer",
            onEnter: operator.handleShowAnswer.bind(operator),
            presentationSlideToShow: "slide-clue-answer",
            transitions: [{
                type: TransitionType.Timeout,
                duration: settings.displayDurationAnswerMs,
                //countdownTimerProgressElementGroup: "shared",
                destination: "checkGameEnd"
            }]
        }, {
            name: "checkGameEnd",
            transitions: [{
                type: TransitionType.If,
                condition: operator.shouldGameEnd.bind(operator),
                then: { destination: "gameEnd" },
                else: { destination: "getClueFromJService" }
            }]
        }, {
            name: "gameEnd",
            presentationSlideToShow: "slide-game-end",
            onEnter: operator.handleGameEnd.bind(operator),
            transitions: [{
                type: TransitionType.ManualTrigger,
                triggerName: "manualTrigger_reset",
                destination: "idle"
            }]
        }
    ];

}