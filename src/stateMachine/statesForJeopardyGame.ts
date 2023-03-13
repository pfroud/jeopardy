import { Operator } from "../operator/Operator";
import { Settings } from "../Settings";
import { CountdownBehavior, StateMachineState } from "./typesForStateMachine";

export function getStatesForJeopardyGame(operator: Operator, settings: Settings): StateMachineState[] {

    return [
        {
            NAME: "idle",
            PRESENTATION_SLIDE_TO_SHOW: "slide-jeopardy-logo",
            TRANSITIONS: [{
                TYPE: "manualTrigger",
                TRIGGER_NAME: "startGame",
                DESTINATION: "getClueFromJService"
            }],
        }, {
            NAME: "getClueFromJService",
            INSTRUCTIONS: "Loading clue...",
            PRESENTATION_SLIDE_TO_SHOW: "slide-spinner",
            TRANSITIONS: [{
                TYPE: "promise",
                /*
                The promise only tells the state machine when to go to the next state.
                The promise does NOT pass the clue object to the state machine.
                The clue object is only stored by the operator.
                */
                FUNCTION_TO_GER_PROMISE: operator.getClueFromJService.bind(operator),
                DESTINATION: "showClueCategoryAndValue"
            }],
        }, {
            /*
            The category and dollar value are shown on in big text the center of the
            presentation window for a fixed amount of time.
            */
            NAME: "showClueCategoryAndValue",
            INSTRUCTIONS: "Read aloud the category and dollar value.",
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-category-and-value",
            TRANSITIONS: [{
                TYPE: "timeout",
                INITIAL_DURATION: settings.displayDurationCategoryMillisec,
                BEHAVIOR: CountdownBehavior.ContinueTimerUntilManuallyReset,
                DESTINATION: "showClueQuestion",
                /*
                Don't put this as onEnter of the showClueQuestion state because it does
                a bunch of stuff and would get called every time lockout happens
                */
                ON_TRANSITION: operator.handleShowClueQuestion.bind(operator)
            }, {
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "showMessageForSpecialCategory",
                GUARD_CONDITION: operator.isCurrentClueSpecialCategory.bind(operator)
            }],
        }, {
            /*
            The game is paused to display an information message about a Jeopardy category
            with special meaning (quotation marks, before & after, etc).
            */
            NAME: "showMessageForSpecialCategory",
            ON_ENTER: operator.showSpecialCategoryOverlay.bind(operator),
            ON_EXIT: operator.hideSpecialCategoryOverlay.bind(operator),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "showClueCategoryAndValue"
            }]
        }, {
            /*
            The clue question is shown on center of the presentation window. The person operating the
            game is supposed to read the question out loud and press space when done reading it.
            Also the category and dollar value are shown on the presentation header.
            */
            NAME: "showClueQuestion",
            INSTRUCTIONS: "Read the question out loud. Buzzers open when you press space.",
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-question",
            ON_ENTER: operator.fitClueQuestionToScreenInOperatorWindow.bind(operator),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "waitForBuzzes",
                /*
                Don't put this function as the onEnter for the waitForBuzzes state
                because there are two other ways to enter the waitForBuzzes state.
                */
                ON_TRANSITION: operator.handleDoneReadingClueQuestion.bind(operator)
            }, {
                TYPE: "keyboard",
                KEYBOARD_KEYS: "123456789",
                DESTINATION: "showClueQuestion",
                ON_TRANSITION: operator.handleLockout.bind(operator)
            }],
        }, {
            /*
            The operator has finished reading the clue question, people can press the buzzer now.
            */
            NAME: "waitForBuzzes",
            INSTRUCTIONS: "Wait for people to answer.",
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: "123456789",
                DESTINATION: "waitForTeamAnswer",
                GUARD_CONDITION: operator.canTeamBuzz.bind(operator)
            }, {
                TYPE: "timeout",
                DESTINATION: "showAnswer",
                INITIAL_DURATION: settings.timeoutWaitForBuzzesMillisec,
                BEHAVIOR: CountdownBehavior.ContinueTimerUntilManuallyReset,
                ON_TRANSITION: operator.playSoundQuestionTimeout.bind(operator)
            }],
        }, {
            /*
            A team has pressed the buzzer, now we are waiting for them to say their answer.
            */
            NAME: "waitForTeamAnswer",
            INSTRUCTIONS: "Did they answer correctly? y / n",
            ON_ENTER: operator.startAnswer.bind(operator),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: "y",
                DESTINATION: "showAnswer",
                ON_TRANSITION: operator.handleAnswerCorrect.bind(operator)
            }, {
                TYPE: "keyboard",
                KEYBOARD_KEYS: "n",
                DESTINATION: "answerWrongOrTimeout"
            }, {
                TYPE: "timeout",
                INITIAL_DURATION: settings.timeoutWaitForAnswerMillisec,
                BEHAVIOR: CountdownBehavior.ResetTimerEveryTimeYouEnterTheState,
                IS_WAITING_FOR_TEAM_TO_ANSWER_AFTER_BUZZ: true,
                DESTINATION: "answerWrongOrTimeout"
            }],
        },
        {
            NAME: "answerWrongOrTimeout",
            ON_ENTER: operator.handleAnswerWrongOrTimeout.bind(operator),
            TRANSITIONS: [{
                TYPE: "if",
                CONDITION: operator.haveAllTeamsAnswered.bind(operator),
                THEN: { DESTINATION: "showAnswer" },
                ELSE: { DESTINATION: "waitForBuzzes" }
            }],
        }, {
            NAME: "showAnswer",
            INSTRUCTIONS: "Let people read the answer. Press space to continue.",
            ON_ENTER: operator.handleShowAnswer.bind(operator),
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-answer",
            TRANSITIONS: [
                /*
                {
                type: "timeout",
                initialDuration: settings.displayDurationAnswerMillisec,
                behavior: CountdownBehavior.ResetTimerEveryTimeYouEnterTheState,
                destination: "showBuzzHistory"
            }
            */
                {
                    TYPE: "keyboard",
                    KEYBOARD_KEYS: " ", //space
                    DESTINATION: "maybeShowBuzzHistory"
                }
            ],
        }, {
            NAME: "maybeShowBuzzHistory",
            TRANSITIONS: [{
                TYPE: "if",
                CONDITION: operator.shouldShowBuzzHistory.bind(operator),
                THEN: { DESTINATION: "showBuzzHistory" },
                ELSE: { DESTINATION: "checkGameEnd" }
            }]
        }, {
            NAME: "showBuzzHistory",
            INSTRUCTIONS: "The buzz history is showing. Press space to continue.",
            ON_ENTER: operator.showBuzzHistory.bind(operator),
            ON_EXIT: operator.hideBuzzHistory.bind(operator),
            PRESENTATION_SLIDE_TO_SHOW: "slide-buzz-history-chart",
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "checkGameEnd"
            }]
        }, {
            NAME: "checkGameEnd",
            TRANSITIONS: [{
                TYPE: "if",
                CONDITION: operator.shouldGameEnd.bind(operator),
                THEN: { DESTINATION: "gameEnd" },
                ELSE: { DESTINATION: "getClueFromJService" }
            }],
        }, {
            NAME: "gameEnd",
            INSTRUCTIONS: "Game over",
            PRESENTATION_SLIDE_TO_SHOW: "slide-gameEnd-team-ranking-table",
            ON_ENTER: operator.handleGameEnd.bind(operator),
            TRANSITIONS: [{
                TYPE: "manualTrigger",
                TRIGGER_NAME: "reset",
                DESTINATION: "idle"
            }],
        }
    ];

}
