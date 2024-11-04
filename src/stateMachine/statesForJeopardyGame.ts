import { Operator } from "../operator/Operator";
import { Presentation } from "../presentation/Presentation";
import { Settings } from "../Settings";
import { CountdownBehavior, StateMachineState } from "./typesForStateMachine";

export function getStatesForJeopardyGame(operator: Operator, presentation: Presentation, settings: Settings): StateMachineState[] {

    return [
        {
            NAME: "idle",
            PRESENTATION_SLIDE_TO_SHOW: "slide-jeopardy-logo",
            TRANSITIONS: [{
                TYPE: "manualTrigger",
                TRIGGER_NAME: "startGame",
                DESTINATION: "startNextGameRound"
            }]
        }, {
            // This state 
            NAME: "startNextGameRound",
            PRESENTATION_SLIDE_TO_SHOW: "slide-round-start",
            ON_ENTER: operator.gameRoundStartNext.bind(operator),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ",// space
                ON_TRANSITION: operator.categoryCarouselStart.bind(operator),
                DESTINATION: "showCategoryCarousel"
            }]
        }, {
            NAME: "showCategoryCarousel",
            PRESENTATION_SLIDE_TO_SHOW: "slide-category-carousel",
            TRANSITIONS: [

                {
                    TYPE: "keyboard",
                    KEYBOARD_KEYS: "y",
                    DESTINATION: "showMessageForSpecialCategory",
                    GUARD_CONDITION: operator.categoryCarouselIsSpecialCategory.bind(operator)
                },

                {
                    TYPE: "keyboardWithIf",
                    KEYBOARD_KEYS: " ", //space
                    CONDITION: operator.categoryCarouselHasMore.bind(operator),
                    THEN: {
                        DESTINATION: "showCategoryCarousel",
                        ON_TRANSITION: operator.categoryCarouselShowNext.bind(operator)
                    },
                    ELSE: {
                        DESTINATION: "showGameBoard",
                        ON_TRANSITION: operator.categoryCarouselStop.bind(operator)
                    }

                }]
        },

        {
            /*
            The game is paused to display an information message about a Jeopardy category
            with special meaning (quotation marks, before & after, etc).
            */

            NAME: "showMessageForSpecialCategory",
            ON_ENTER: operator.specialCategoryPopupShow.bind(operator),
            ON_EXIT: operator.specialCategoryPopupHide.bind(operator),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "showCategoryCarousel"
            }]
        },

        {
            NAME: "showGameBoard",
            INSTRUCTIONS: "Click on a clue in the game board.",
            PRESENTATION_SLIDE_TO_SHOW: "slide-game-board",
            ON_ENTER: operator.gameBoardShow.bind(operator),
            ON_EXIT: operator.gameBoardHide.bind(operator),
            TRANSITIONS: [{
                // This manual trigger is called from Operator.onGameBoardClueClicked().
                TYPE: "manualTrigger",
                TRIGGER_NAME: "userChoseClue",
                DESTINATION: "showClueCategoryAndValue"
            }, {
                TYPE: "timeout",
                BEHAVIOR: CountdownBehavior.ResetTimerEveryTimeYouEnterTheState,
                INITIAL_DURATION_MILLISEC: settings.timeBeforeRandomClueIsChosen,
                ON_TRANSITION: operator.teamTimedOutChoosingClue.bind(operator),
                DESTINATION: "showClueCategoryAndValue"
            }]
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
                INITIAL_DURATION_MILLISEC: settings.displayDurationCategoryMillisec,
                BEHAVIOR: CountdownBehavior.ContinueTimerUntilManuallyReset,
                DESTINATION: "showClueQuestion",
                /*
                Don't put this as onEnter of the showClueQuestion state because it does
                a bunch of stuff and would get called every time lockout happens
                */
                ON_TRANSITION: operator.onShowClueQuestion.bind(operator)
            }
            ]
        }, {
            /*
            The clue question is shown on center of the presentation window. The person operating the
            game is supposed to read the question out loud and press space when done reading it.
            Also the category and dollar value are shown on the presentation header.
            */
            NAME: "showClueQuestion",
            INSTRUCTIONS: "Read the question out loud. Buzzers open when you press space.",
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-question",
            ON_ENTER: presentation.fitClueQuestionToWindow.bind(presentation),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "waitForBuzzes",
                /*
                Don't put this function as the onEnter for the waitForBuzzes state
                because there are two other ways to enter the waitForBuzzes state.
                */
                ON_TRANSITION: operator.onDoneReadingClueQuestion.bind(operator)
            }, {
                TYPE: "keyboard",
                KEYBOARD_KEYS: "123456789",
                DESTINATION: "showClueQuestion",
                ON_TRANSITION: operator.onTeamLockout.bind(operator)
            }]
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
                GUARD_CONDITION: operator.teamCanBuzz.bind(operator)
            }, {
                TYPE: "timeout",
                DESTINATION: "showAnswer",
                INITIAL_DURATION_MILLISEC: settings.timeoutWaitForBuzzesMillisec,
                BEHAVIOR: CountdownBehavior.ContinueTimerUntilManuallyReset,
                ON_TRANSITION: operator.playSoundQuestionTimeout.bind(operator)
            }]
        }, {
            /*
            A team has pressed the buzzer, now we are waiting for them to say their answer.
            */
            NAME: "waitForTeamAnswer",
            INSTRUCTIONS: "Did they answer correctly? y / n",
            ON_ENTER: operator.teamAnswerStart.bind(operator),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: "y",
                DESTINATION: "showAnswer",
                ON_TRANSITION: operator.onAnswerCorrect.bind(operator)
            }, {
                TYPE: "keyboard",
                KEYBOARD_KEYS: "n",
                DESTINATION: "answerWrongOrTimeout"
            }, {
                TYPE: "timeout",
                INITIAL_DURATION_MILLISEC: settings.timeoutWaitForAnswerMillisec,
                BEHAVIOR: CountdownBehavior.ResetTimerEveryTimeYouEnterTheState,
                IS_WAITING_FOR_TEAM_TO_ANSWER_AFTER_BUZZ: true,
                DESTINATION: "answerWrongOrTimeout"
            }]
        },
        {
            NAME: "answerWrongOrTimeout",
            ON_ENTER: operator.onAnswerWrongOrTimeout.bind(operator),
            TRANSITIONS: [{
                TYPE: "if",
                CONDITION: operator.isAllTeamsAnswered.bind(operator),
                THEN: { DESTINATION: "showAnswer" },
                ELSE: { DESTINATION: "waitForBuzzes" }
            }]
        }, {
            NAME: "showAnswer",
            INSTRUCTIONS: "Let people read the answer. Press space to continue.",
            ON_ENTER: operator.onShowAnswer.bind(operator),
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-answer",
            TRANSITIONS: [
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
                CONDITION: operator.buzzHistoryShouldShow.bind(operator),
                THEN: { DESTINATION: "showBuzzHistory" },
                ELSE: { DESTINATION: "checkGameRoundOver" }
            }]
        }, {
            NAME: "showBuzzHistory",
            INSTRUCTIONS: "The buzz history is showing. Press space to continue.",
            ON_ENTER: operator.onBuzzHistoryShow.bind(operator),
            ON_EXIT: operator.onBuzzHistoryHide.bind(operator),
            PRESENTATION_SLIDE_TO_SHOW: "slide-buzz-history-chart",
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "checkGameRoundOver"
            }]
        }, {
            NAME: "checkGameRoundOver",
            TRANSITIONS: [{
                TYPE: "if",
                CONDITION: operator.isGameRoundOver.bind(operator),
                THEN: { DESTINATION: "nextRoundOrEndGame" },
                ELSE: { DESTINATION: "showGameBoard" }
            }]

        }, {
            NAME: "nextRoundOrEndGame",
            TRANSITIONS: [{
                TYPE: "if",
                CONDITION: operator.gameRoundHasMore.bind(operator),
                THEN: { DESTINATION: "startNextGameRound" },
                ELSE: { DESTINATION: "gameEnd" }
            }]
        }, {
            NAME: "gameEnd",
            INSTRUCTIONS: "Game over",
            PRESENTATION_SLIDE_TO_SHOW: "slide-gameEnd-team-ranking-table",
            ON_ENTER: operator.onGameEnd.bind(operator),
            TRANSITIONS: [{
                TYPE: "manualTrigger",
                TRIGGER_NAME: "reset",
                DESTINATION: "idle"
            }]
        }
    ];

}
