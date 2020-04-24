import { StateMachine } from "./StateMachine.js";
import {StateMachineState, TransitionType} from "./stateInterfaces.js";
import { Operator } from "../operator/Operator.js";
import { Settings } from "../Settings.js";

export function getStates(stateMachine: StateMachine, operator: Operator, settings: Settings): StateMachineState[] {

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
            name: "state_idle",
            showSlide: "slide-jeopardy-logo",
            transitions: [{
                    type: TransitionType.Manual,
                    triggerName: "manualTrigger_startGame",
                    dest: "state_fetchClue"
                }]
        }, {
            name: "state_fetchClue",
            showSlide: "slide-spinner",
            onEnter: operator.getClue,
            transitions: [{
                    type: TransitionType.Promise,
                    dest: "state_showCategoryAndDollars"
                }]
        }, {
            name: "state_showCategoryAndDollars",
            showSlide: "slide-clue-category-and-dollars",
            transitions: [{
                    type: TransitionType.Timeout,
                    duration: settings.displayDurationCategoryMs,
                    dest: "state_showQuestion",
                    fn: operator.showClueQuestion
                }]
        },
        {
            name: "state_showQuestion",
            transitions: [{
                    type: TransitionType.Keyboard,
                    keys: " ", //space
                    dest: "state_waitForBuzzesRestartTimer"
                }, {
                    type: TransitionType.Keyboard,
                    keys: "123456789",
                    dest: "state_showQuestion",
                    fn: operator.handleLockout
                }]
        }, 
        {
            name: "state_waitForBuzzesRestartTimer",
            onEnter: operator.handleDoneReadingClueQuestion,
            onExit: stateMachine.saveRemainingTime,
            transitions: [{
                    type: TransitionType.Timeout,
                    duration: settings.timeoutWaitForBuzzesMs,
                    dest: "state_showAnswer",
                    fn: operator.playTimeoutSound
                }, {
                    type: TransitionType.Keyboard,
                    keys: "123456789",
                    dest: "state_tryTeamAnswer"
                }]
        }, {
            name: "state_waitForBuzzesResumeTimer",
            onExit: stateMachine.saveRemainingTime,
            transitions: [{
                    type: TransitionType.Timeout,
                    duration: () => stateMachine.remainingQuestionTimeMs, //todo look at code implementing stateMachineInstance
                    dest: "state_showAnswer",
                    fn: operator.playTimeoutSound
                }, {
                    type: TransitionType.Keyboard,
                    keys: "123456789",
                    dest: "state_tryTeamAnswer"
                }
            ]
        }, {
            name: "state_tryTeamAnswer",
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
                    fn: operator.handleAnswerRight

                }, {
                    type: TransitionType.Keyboard,
                    keys: "n",
                    dest: "state_subtractMoney"
                }, {
                    type: TransitionType.Timeout,
                    duration: settings.timeoutAnswerMs,
                    countdownTimerShowDots: true,
                    dest: "state_subtractMoney"
                }
            ]
        },
        {
            name: "state_subtractMoney",
            onEnter: operator.handleAnswerWrong,
            transitions: [{
                    type: TransitionType.If,
                    condition: operator.haveAllTeamsAnswered,
                    then: {dest: "state_showAnswer"},
                    else: {dest: "state_waitForBuzzesResumeTimer"}
                }]
        },
        /*
        {
            name: "state_playTimeoutSound",
            onEnter: operator.playTimeoutSound,
            transitions: [{
                    type: TransitionType.Immediate,
                    dest: "state_showAnswer"
                }]
        },
        */
        {
            name: "state_showAnswer",
            onEnter: operator.handleShowAnswer,
            showSlide: "slide-clue-answer",
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
                    else: {dest: "state_fetchClue"}
                }]
        }, {
            name: "state_gameEnd",
            showSlide: "slide-game-end",
            onEnter: operator.handleGameEnd,
            transitions: [{
                    type: TransitionType.Manual,
                    triggerName: "manualTrigger_reset",
                    dest: "state_idle"
                }]
        }
    ];

}