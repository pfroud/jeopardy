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
            NAME: "startNextGameRound",
            PRESENTATION_SLIDE_TO_SHOW: "slide-round-start",
            ON_ENTER: operator.gameRoundStartNext.bind(operator),
            TRANSITIONS:
                [{
                    TYPE: "keyboardWithIf",
                    KEYBOARD_KEYS: " ", //space
                    CONDITION: () => new URLSearchParams(window.location.search).has("skipCategoryCarousel"),
                    THEN: {
                        DESTINATION: "showGameBoard",
                        ON_TRANSITION: operator.categoryCarouselStop.bind(operator)
                    },
                    ELSE: {
                        DESTINATION: "showCategoryCarousel",
                        ON_TRANSITION: operator.categoryCarouselStart.bind(operator)
                    }
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
                }, {
                    TYPE: "keyboardWithIf",
                    KEYBOARD_KEYS: " ", //space
                    CONDITION: operator.categoryCarouselHasMore.bind(operator),
                    THEN: {
                        /*
                        The destination is the same as the current state, which usually 
                        means you should put this in KEYBOARD_LISTENERS instead of TRANSITIONS.
                        But then we would need to check the condition in two separate places,
                        which I think is harder to read/understand. Since this state does not
                        have an ON_ENTER function I think it's ok.
                        */
                        DESTINATION: "showCategoryCarousel",
                        ON_TRANSITION: operator.categoryCarouselShowNext.bind(operator)
                    },
                    ELSE: {
                        DESTINATION: "showGameBoard",
                        ON_TRANSITION: operator.categoryCarouselStop.bind(operator)
                    }
                }]
        }, {
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
        }, {
            NAME: "showGameBoard",
            OPERATOR_INSTRUCTIONS_HTML: "Click on a clue in the game board.",
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
            OPERATOR_INSTRUCTIONS_HTML: "Read aloud the category and dollar value.",
            ON_ENTER: operator.onShowClueCategoryAndValue.bind(operator),
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
            OPERATOR_INSTRUCTIONS_HTML: "Read the question out loud then press space to open the buzzers.",
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-question",
            ON_ENTER: presentation.fitClueQuestionToWindow.bind(presentation),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "waitForBuzzes",
                /*
                Don't put this function as the ON_ENTER for the waitForBuzzes state
                because there are two other ways to enter the waitForBuzzes state.
                */
                ON_TRANSITION: operator.onDoneReadingClueQuestion.bind(operator)
            }],
            KEYBOARD_LISTENERS: [{
                KEYBOARD_KEYS: operator.getKeyboardKeysForTeamNumbers.bind(operator),
                ON_KEY_DOWN: operator.onTeamLockout.bind(operator)
            }]
        }, {
            /*
            The operator has finished reading the clue question, people can press the buzzer now.
            */
            NAME: "waitForBuzzes",
            OPERATOR_INSTRUCTIONS_HTML: "Wait for people to answer.",
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: operator.getKeyboardKeysForTeamNumbers.bind(operator),
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
            OPERATOR_INSTRUCTIONS_HTML: "Decide whether they answer correctly. Press Y if correct or N if wrong.",
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
        }, {
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
            OPERATOR_INSTRUCTIONS_HTML: "Let people read the answer. Press Q to show what the question was. Press space to continue.",
            ON_ENTER: operator.onShowAnswer.bind(operator),
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-answer",
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "maybeShowBuzzHistory"
            }],
            KEYBOARD_LISTENERS: [{
                KEYBOARD_KEYS: "q",
                ON_KEY_DOWN: operator.toggleQuestionInAnswerSlide.bind(operator)
            }]
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
            OPERATOR_INSTRUCTIONS_HTML: "Discuss the buzz history if needed, press space to continue.",
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
                ELSE: { DESTINATION: "finalJeopardyIntro" }
            }]
        },
        {
            NAME: "finalJeopardyIntro",
            PRESENTATION_SLIDE_TO_SHOW: "slide-round-start", // we will use this slide to display text
            OPERATOR_INSTRUCTIONS_HTML:
                `Get ready for Final Jeopardy.<br>
            Have all the teams write their name name on a piece of paper.<br>
            Press Space to show the category.`,
            ON_ENTER: operator.finalJeopardyStart.bind(operator),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "finalJeopardyShowCategory"
            }
            ]
        },
        {
            NAME: "finalJeopardyShowCategory",
            OPERATOR_INSTRUCTIONS_HTML: "Read the Final Jeopardy category out loud. Press Space to show the question.",
            ON_ENTER: operator.finalJeopardyShowCategory.bind(operator),
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-category-and-value",
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "finalJeopardyShowQuestion"
            }]
        },
        {
            // TODO automatically play music
            NAME: "finalJeopardyShowQuestion",
            OPERATOR_INSTRUCTIONS_HTML: "Read the Final Jeopardy question out loud.<br>Press Space to show the answer to the operator only.",
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-question",
            ON_ENTER: operator.finalJeopardyShowQuestion.bind(operator),
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "finalJeopardyShowAnswer"
            }]
        },
        {
            // TODO change this state so it shows the answer to the operator only, and shows the table of wagers with before/after money.
            // then add another state to show the answer in the presentation?
            NAME: "finalJeopardyShowAnswer",
            OPERATOR_INSTRUCTIONS_HTML: "Read the Final Jeopardy answer. Press space to end the game.",
            ON_ENTER: operator.finalJeopardyShowAnswer.bind(operator),
            PRESENTATION_SLIDE_TO_SHOW: "slide-clue-answer",
            TRANSITIONS: [{
                TYPE: "keyboard",
                KEYBOARD_KEYS: " ", //space
                DESTINATION: "gameEnd"
            }]
        },
        {
            NAME: "gameEnd",
            OPERATOR_INSTRUCTIONS_HTML: "Game over",
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
