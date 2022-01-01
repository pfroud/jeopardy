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
                durationForNewCountdownTimer: settings.displayDurationCategoryMs,
                destination: "showClueQuestion",
                /*
                Don't put this as onEnter of the showClueQuestion state because it does
                a bunch of stuff and would get called every time lockout happens
                */
                onTransition: operator.handleShowClueQuestion.bind(operator)
            }]
        }, {
            /*
            The clue question is shown on center of the presentation window. The person operating the
            game is supposed to read the question out loud and press space when done reading it.
            Also the category and dollar value are shown on the presentation header.
            */
            name: "showClueQuestion",
            presentationSlideToShow: "slide-clue-question",
            transitions: [{
                type: TransitionType.Keyboard,
                keyboardKeys: " ", //space
                destination: "waitForBuzzes",
                /*
                Don't put this function as the onEnter for the waitForBuzzes state
                because there are two other ways to enter the waitForBuzzes state.
                */
                onTransition: operator.handleDoneReadingClueQuestion.bind(operator)
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "123456789",
                destination: "showClueQuestion",
                onTransition: operator.handleLockout.bind(operator)
            }]
        }, {
            name: "waitForBuzzes",
            transitions: [{
                type: TransitionType.Timeout,
                destination: "showAnswer",
                countdownTimerToResume: operator.getCountdownTimerToResumeForWaitForBuzzesState.bind(operator),
                onTransition: operator.playSoundQuestionTimeout.bind(operator)
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "123456789",
                destination: "checkIfTeamCanAnswer"
            }]
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
            onEnter: operator.handleBuzzerPress.bind(operator), // TODO I want to move this to the transition but it takes a keyboard event???
            transitions: [{
                type: TransitionType.Keyboard,
                keyboardKeys: "y",
                destination: "showAnswer",
                onTransition: operator.handleAnswerCorrect.bind(operator)
            }, {
                type: TransitionType.Keyboard,
                keyboardKeys: "n",
                destination: "answerWrongOrTimeout"
            }, {
                type: TransitionType.Timeout,
                durationForNewCountdownTimer: settings.timeoutAnswerMs,
                countdownTimerShowDots: true,
                destination: "answerWrongOrTimeout"
            }
            ]
        },
        {
            name: "answerWrongOrTimeout",
            onEnter: operator.handleAnswerWrongOrTimeout.bind(operator),
            transitions: [{
                type: TransitionType.If,
                condition: operator.haveAllTeamsAnswered.bind(operator),
                then: { destination: "showAnswer" },
                else: {
                    destination: "waitForBuzzes"
                    // TODO here is where we need to resume the countdown timer
                }
            }]
        }, {
            name: "showAnswer",
            onEnter: operator.handleShowAnswer.bind(operator),
            presentationSlideToShow: "slide-clue-answer",
            transitions: [{
                type: TransitionType.Timeout,
                durationForNewCountdownTimer: settings.displayDurationAnswerMs,
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