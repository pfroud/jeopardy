import { Operator } from "../operator/Operator";
import { Settings } from "../Settings";
import { CountdownBehavior, StateMachineState } from "./stateInterfaces";

export function getStatesForJeopardyGame(operator: Operator, settings: Settings): StateMachineState[] {

    return [
        {
            name: "idle",
            presentationSlideToShow: "slide-jeopardy-logo",
            transitions: [{
                type: "manualTrigger",
                triggerName: "startGame",
                destination: "getClueFromJService"
            }],
        }, {
            name: "getClueFromJService",
            presentationSlideToShow: "slide-spinner",
            transitions: [{
                type: "promise",
                /*
                The promise only tells the state machine when to go to the next state.
                The promise does NOT pass the clue object to the state machine.
                The clue object is only stored by the operator.
                */
                functionToGetPromise: operator.getClueFromJService.bind(operator),
                destination: "showClueCategoryAndValue"
            }],
        }, {
            /*
            The category and dollar value are shown on in big text the center of the
            presentation window for a fixed amount of time.
            */
            name: "showClueCategoryAndValue",
            presentationSlideToShow: "slide-clue-category-and-value",
            transitions: [{
                type: "timeout",
                initialDuration: settings.displayDurationCategoryMillisec,
                behavior: CountdownBehavior.ContinueTimerUntilManuallyReset,
                destination: "showClueQuestion",
                /*
                Don't put this as onEnter of the showClueQuestion state because it does
                a bunch of stuff and would get called every time lockout happens
                */
                onTransition: operator.handleShowClueQuestion.bind(operator)
            }, {
                type: "keyboard",
                keyboardKeys: " ", //space
                destination: "showMessageForSpecialCategory",
                guardCondition: operator.isCurrentClueSpecialCategory.bind(operator)
            }],
        }, {
            /*
            The game is paused to display an information message about a Jeopardy category
            with special meaning (quotation marks, before & after, etc).
            */
            name: "showMessageForSpecialCategory",
            onEnter: operator.showSpecialCategoryOverlay.bind(operator),
            onExit: operator.hideSpecialCategoryOverlay.bind(operator),
            transitions: [{
                type: "keyboard",
                keyboardKeys: " ", //space
                destination: "showClueCategoryAndValue"
            }]
        }, {
            /*
            The clue question is shown on center of the presentation window. The person operating the
            game is supposed to read the question out loud and press space when done reading it.
            Also the category and dollar value are shown on the presentation header.
            */
            name: "showClueQuestion",
            presentationSlideToShow: "slide-clue-question",
            onEnter: operator.fitClueQuestionToScreenInOperatorWindow.bind(operator),
            transitions: [{
                type: "keyboard",
                keyboardKeys: " ", //space
                destination: "waitForBuzzes",
                /*
                Don't put this function as the onEnter for the waitForBuzzes state
                because there are two other ways to enter the waitForBuzzes state.
                */
                onTransition: operator.handleDoneReadingClueQuestion.bind(operator)
            }, {
                type: "keyboard",
                keyboardKeys: "123456789",
                destination: "showClueQuestion",
                onTransition: operator.handleLockout.bind(operator)
            }],
        }, {
            /*
            The operator has finished reading the clue question, people can press the buzzer now.
            */
            name: "waitForBuzzes",
            transitions: [{
                type: "keyboard",
                keyboardKeys: "123456789",
                destination: "waitForTeamAnswer",
                guardCondition: operator.canTeamBuzz.bind(operator)
            }, {
                type: "timeout",
                destination: "showAnswer",
                initialDuration: settings.timeoutWaitForBuzzesMillisec,
                behavior: CountdownBehavior.ContinueTimerUntilManuallyReset,
                onTransition: operator.playSoundQuestionTimeout.bind(operator)
            }],
        }, {
            /*
            A team has pressed the buzzer, now we are waiting for them to say their answer.
            */
            name: "waitForTeamAnswer",
            onEnter: operator.handleBuzzerPress.bind(operator),
            transitions: [{
                type: "keyboard",
                keyboardKeys: "y",
                destination: "showAnswer",
                onTransition: operator.handleAnswerCorrect.bind(operator)
            }, {
                type: "keyboard",
                keyboardKeys: "n",
                destination: "answerWrongOrTimeout"
            }, {
                type: "timeout",
                initialDuration: settings.timeoutWaitForAnswerMillisec,
                behavior: CountdownBehavior.ResetTimerEveryTimeYouEnterTheState,
                isWaitingForTeamToAnswerAfterBuzz: true,
                destination: "answerWrongOrTimeout"
            }],
        },
        {
            name: "answerWrongOrTimeout",
            onEnter: operator.handleAnswerWrongOrTimeout.bind(operator),
            transitions: [{
                type: "if",
                condition: operator.haveAllTeamsAnswered.bind(operator),
                then: { destination: "showAnswer" },
                else: { destination: "waitForBuzzes" }
            }],
        }, {
            name: "showAnswer",
            onEnter: operator.handleShowAnswer.bind(operator),
            presentationSlideToShow: "slide-clue-answer",
            transitions: [{
                type: "timeout",
                initialDuration: settings.displayDurationAnswerMillisec,
                behavior: CountdownBehavior.ResetTimerEveryTimeYouEnterTheState,
                destination: "checkGameEnd"
            }],
        }, {
            name: "checkGameEnd",
            transitions: [{
                type: "if",
                condition: operator.shouldGameEnd.bind(operator),
                then: { destination: "gameEnd" },
                else: { destination: "getClueFromJService" }
            }],
        }, {
            name: "gameEnd",
            presentationSlideToShow: "slide-gameEnd-team-ranking-table",
            onEnter: operator.handleGameEnd.bind(operator),
            transitions: [{
                type: "manualTrigger",
                triggerName: "reset",
                destination: "idle"
            }],
        }
    ];

}
