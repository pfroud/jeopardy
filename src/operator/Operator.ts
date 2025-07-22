import { AudioManager } from "../AudioManager";
import { BuzzAnswerResult, BuzzHistoryChart, BuzzHistoryForClue, BuzzHistoryRecord, BuzzResult, BuzzResultStartAnswer } from "../BuzzHistoryChart";
import { CountdownTimer } from "../CountdownTimer";
import { FinalJeopardyWagersTable } from "../FinalJeopardyWagersTable";
import { GameBoard } from "../GameBoard";
import { Settings } from "../Settings";
import { Team, TeamSavedInLocalStorage, TeamState } from "../Team";
import { querySelectorAndCheck } from "../commonFunctions";
import { createGameEndLineChartOfMoneyOverTime, createGameEndPieChartsOfBuzzResults } from "../gameEndStatisticsCharts";
import { Presentation } from "../presentation/Presentation";
import { SCRAPED_GAME } from "../scrapedGame";
import { checkSpecialCategory, SpecialCategory } from "../specialCategories";
import { StateMachine } from "../stateMachine/StateMachine";
import { RevealedClue } from "../typesForGame";

interface SavedGameInLocalStorage {
    readonly GAME_ROUND_TIMER_REMAINING_MILLISEC: number,
    readonly TEAMS: readonly TeamSavedInLocalStorage[]
    // todo save the settings
}

export class Operator {

    /** Not readonly because it can be changed by the human operator. */
    public teamCount = 4;

    private static readonly LOCAL_STORAGE_KEY = "jeopardy";

    private readonly AUDIO_MANAGER: AudioManager;
    private readonly SETTINGS: Settings;
    private readonly DIV_CLUE_WRAPPER: HTMLDivElement;
    private readonly DIV_CLUE_QUESTION: HTMLDivElement;
    private readonly DIV_CLUE_VALUE: HTMLDivElement;
    private readonly DIV_CLUE_CATEGORY: HTMLDivElement;
    private readonly DIV_CLUE_ANSWER: HTMLDivElement;
    private readonly TR_QUESTION: HTMLTableRowElement;
    private readonly TR_ANSWER: HTMLTableRowElement;
    private readonly DIV_PAUSED: HTMLDivElement;
    private readonly DIV_INSTRUCTIONS: HTMLDivElement;
    private readonly BUTTON_START_GAME: HTMLButtonElement;
    private readonly BUTTON_SKIP_CLUE: HTMLButtonElement;
    private readonly BUTTON_ADD_TIME_TO_GAME_ROUND_TIMER: HTMLButtonElement;
    private readonly DIV_SPECIAL_CATEGORY_PROMPT: HTMLDivElement;
    private readonly SPAN_SPECIAL_CATEGORY_PROMPT_TITLE: HTMLSpanElement;
    private readonly DIV_SPECIAL_CATEGORY_POPUP: HTMLDivElement;
    private readonly DIV_BUZZ_HISTORY_POPUP: HTMLDivElement;
    private readonly DIV_BACKDROP_FOR_POPUPS: HTMLDivElement;

    private readonly SPECIAL_CATEGORY_POPUP_TITLE: HTMLElement;
    private readonly SPECIAL_CATEGORY_POPUP_DESCRIPTION: HTMLElement;
    private readonly SPECIAL_CATEGORY_POPUP_EXAMPLE_CATEGORY: HTMLElement;
    private readonly SPECIAL_CATEGORY_POPUP_EXAMPLE_QUESTION: HTMLElement;
    private readonly SPECIAL_CATEGORY_POPUP_EXAMPLE_ANSWER: HTMLElement;

    private readonly DIV_GAME_END_POPUP_BUTTONS: HTMLDivElement;
    private readonly DIV_GAME_END_POPUP: HTMLDivElement;
    private readonly DIV_GAME_END_TEAM_RANKING_WRAPPER: HTMLDivElement;
    private readonly DIV_GAME_END_PIE_CHARTS: HTMLDivElement;
    private readonly DIV_GAME_END_LINE_CHART: HTMLDivElement;
    private readonly DIV_GAME_BOARD_WRAPPER: HTMLDivElement;

    private readonly GAME_ROUND_TIMER: CountdownTimer; //not readonly because it may be changed when we load a game from localStorage
    /**
    * Set of strings representing keyboard keys which are valid buzzer
    * inputs for the current team count.
    * 
    * Why does the Set contain strings? The `charCode` and `keyCode`
    * properties on KeyboardEvent are both deprecated, and the `code`
    * property is a string like "Digit1", "Digit2", so apparently we
    * need to use the `key` property which is a string like "1", "2".
    */
    private readonly KEYBOARD_KEYS_FOR_TEAM_NUMBERS = new Set<string>();
    private presentation?: Presentation;
    private stateMachine?: StateMachine;
    private gameBoard?: GameBoard;

    private teamArray?: Team[];
    private teamNameInputElements?: HTMLInputElement[];
    private teamPresentlyAnswering: Team | undefined;

    private presentClue?: RevealedClue;
    private buzzHistoryForClue?: BuzzHistoryForClue;
    private buzzHistoryChart: BuzzHistoryChart | undefined;
    private buzzHistoryRecordForActiveAnswer: BuzzHistoryRecord<BuzzResultStartAnswer> | undefined;

    private isPaused_ = false; // add underscore to property name so the method can be called isPaused
    private questionCountForPieCharts = 0;
    private gameRoundIndex = -1;
    private categoryCarouselIndex = -1;
    private teamIndexToPickClue = 0;

    public constructor(audioManager: AudioManager, settings: Settings) {
        this.AUDIO_MANAGER = audioManager;
        this.SETTINGS = settings;

        this.DIV_CLUE_WRAPPER = querySelectorAndCheck(document, "div#clue-wrapper");
        this.DIV_CLUE_QUESTION = querySelectorAndCheck(document, "div#div-clue-question");
        this.DIV_CLUE_VALUE = querySelectorAndCheck(document, "div#div-clue-value");
        this.DIV_CLUE_CATEGORY = querySelectorAndCheck(document, "div#div-clue-category");
        this.DIV_CLUE_ANSWER = querySelectorAndCheck(document, "div#div-clue-answer");
        this.TR_QUESTION = querySelectorAndCheck(document, "tr#tr-clue-question");
        this.TR_ANSWER = querySelectorAndCheck(document, "tr#tr-clue-answer");
        this.DIV_PAUSED = querySelectorAndCheck(document, "div#paused");
        this.DIV_INSTRUCTIONS = querySelectorAndCheck(document, "div#instructions");
        this.BUTTON_START_GAME = querySelectorAndCheck(document, "button#start-game");
        this.BUTTON_SKIP_CLUE = querySelectorAndCheck(document, "button#skip-clue");
        this.BUTTON_ADD_TIME_TO_GAME_ROUND_TIMER = querySelectorAndCheck(document, "button#add-one-minute");

        this.DIV_BACKDROP_FOR_POPUPS = querySelectorAndCheck(document, "div#backdrop-for-popups");

        this.DIV_BUZZ_HISTORY_POPUP = querySelectorAndCheck(document, "div#buzz-history-chart-popup");

        this.DIV_SPECIAL_CATEGORY_PROMPT = querySelectorAndCheck(document, "div#special-category-prompt");
        this.SPAN_SPECIAL_CATEGORY_PROMPT_TITLE = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_PROMPT, "span#special-category-prompt-title");

        this.DIV_SPECIAL_CATEGORY_POPUP = querySelectorAndCheck(document, "div#special-category-popup");
        this.SPECIAL_CATEGORY_POPUP_TITLE = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, ".popup-title");
        this.SPECIAL_CATEGORY_POPUP_DESCRIPTION = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-popup-description");
        this.SPECIAL_CATEGORY_POPUP_EXAMPLE_CATEGORY = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-popup-example-category");
        this.SPECIAL_CATEGORY_POPUP_EXAMPLE_QUESTION = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-popup-example-question");
        this.SPECIAL_CATEGORY_POPUP_EXAMPLE_ANSWER = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-popup-example-answer");

        this.DIV_GAME_END_POPUP = querySelectorAndCheck(document, "div#game-end-popup");
        this.DIV_GAME_END_POPUP_BUTTONS = querySelectorAndCheck(this.DIV_GAME_END_POPUP, "div#game-end-popup-buttons");
        this.DIV_GAME_END_TEAM_RANKING_WRAPPER = querySelectorAndCheck(this.DIV_GAME_END_POPUP, "div#team-ranking-wrapper");
        this.DIV_GAME_END_PIE_CHARTS = querySelectorAndCheck(this.DIV_GAME_END_POPUP, "div#pie-charts");
        this.DIV_GAME_END_LINE_CHART = querySelectorAndCheck(this.DIV_GAME_END_POPUP, "div#line-chart");

        this.DIV_GAME_BOARD_WRAPPER = querySelectorAndCheck(document, "div#game-board-wrapper");

        this.initKeyboardListenerToPause();
        this.initMouseListeners();
        this.lookForSavedGame();

        this.GAME_ROUND_TIMER = new CountdownTimer(this.SETTINGS.gameRoundTimeLimitMillisec);
        this.GAME_ROUND_TIMER.addProgressElement(querySelectorAndCheck(document, "div#game-round-timer progress"));
        this.GAME_ROUND_TIMER.addTextElement(querySelectorAndCheck(document, "div#game-round-timer div.remaining-time-text"));

        // web browser remembers the disabled state between reloads
        this.BUTTON_SKIP_CLUE.setAttribute("disabled", "disabled");

        window.open("../presentation/presentation.html", "windowPresentation");

        /*
        The rest of the initialization happens in this.handlePresentationReady(),
        which gets called by the Presentation instance in the window we opened.
        */
    }

    /**
     * This method gets called from the Presentation instance in the other window.
     */
    public onPresentationReady(presentationInstanceFromOtherWindow: Presentation): void {

        window.focus(); //focus the operator window

        this.presentation = presentationInstanceFromOtherWindow;
        this.initTeams();

        this.gameBoard = new GameBoard(this,
            querySelectorAndCheck(document, "table#game-board"),
            this.presentation.getGameBoardTable()
        );

        this.initKeyboardListenersForBuzzerFootswitchIcons();

        this.GAME_ROUND_TIMER.addProgressElement(this.presentation.getProgressElementForGameTimer());

        this.stateMachine = new StateMachine(this.SETTINGS, this, this.presentation, this.AUDIO_MANAGER);

        this.BUTTON_START_GAME.removeAttribute("disabled");
        this.BUTTON_START_GAME.focus();
        this.DIV_INSTRUCTIONS.innerHTML = "Click the button to start the game.";

        /*
        In Firefox, when no other audio is playing from the page, the very beginning
        (approximately the first quarter-second) of sounds are cut off, and very short
        sounds are not played at all. The Jeopardy software uses invisible <audio>
        elements and calls the HTMLAudioElement.play() function, but I can reproduce
        the problem even when clicking the play button on an <audio> element with
        visible controls. The problem does not happen in Chrome.

        To prevent this, we will hold an audio context open by playing silence. This
        solution prevents the computer from going to sleep from inactivity which
        I guess is an unwanted side effect. How to see it:
            - On Windows: open cmd as admin and run `powercfg /requests`.
            - On macOS:
                - GUI: open Activity Monitor and click View > Columns > Preventing Sleep.
                - Terminal: run `pmset -g assertions`.
        */
        const audioContext = new AudioContext();
        const constantSource = new ConstantSourceNode(audioContext, { offset: 0 });
        constantSource.connect(audioContext.destination);
        constantSource.start();

        const testBuzzHistory = false;
        if (testBuzzHistory) {
            this.buzzHistoryForClue = {
                timestampWhenClueQuestionFinishedReading: 0,
                RECORDS: [
                    // team 1 - buzzed too early and was locked out
                    [
                        { startTimestamp: -60, RESULT: { TYPE: "too-early-start-lockout" } },
                        { startTimestamp: 30, RESULT: { TYPE: "ignored", TEAM_STATE_WHY_IT_WAS_IGNORED: "lockout" } },
                    ],

                    //team 2 - answered wrong
                    [
                        { startTimestamp: 90, RESULT: { TYPE: "start-answer", answerResult: "answeredWrongOrTimedOut", endTimestamp: 900 } }
                    ],

                    //team 3 - buzzed while team 2 was answering
                    [
                        { startTimestamp: 120, RESULT: { TYPE: "ignored", TEAM_STATE_WHY_IT_WAS_IGNORED: "other-team-is-answering" } }
                    ],

                    //team 4 - answered right
                    [
                        { startTimestamp: 1050, RESULT: { TYPE: "start-answer", answerResult: "answeredRight", endTimestamp: 1400 } }
                    ]
                ]
            };
            this.stateMachine?.goToState("showBuzzHistory");
        }

        const testGameEndStatsCharts = false;
        if (testGameEndStatsCharts) {
            this.teamArray?.forEach((team, idx) => {
                const teamStats = team.getStatistics();
                teamStats.moneyAtEndOfEachRound = [-200, 200, 500, 100, 300, 400].map(n => n * (idx + 1));
                teamStats.questionsNotBuzzed = 10;
                teamStats.questionsBuzzedThenAnsweredRight = 5;
                teamStats.questionsBuzzedThenAnsweredWrongOrTimedOut = 2;
            });
            this.stateMachine?.goToState("gameEnd");
        }

    }

    /**
    Show a small picture of the footswitch used for the buzzers so people can verify their buzzers are working.

    When a team presses the buzzer, what happens depends on what state the team is in.

    For most of the team states, pressing the buzzer does not do anything. No functions
    get called so we have to use this keyboard listener to record the history.

    There are only two team states in which something interesting happens when the buzzer is pressed.
    Both have dedicated methods in Operator which get called by the state machine:
        - If a team buzzes when in state "operator-is-reading-question", the state machine calls operator.handleLockout().
        - If a team buzzes when in state "can-answer", the state machine calls operator.startAnswer().
        */
    private initKeyboardListenersForBuzzerFootswitchIcons(): void {

        const teamStatesWhereBuzzingDoesSomething = new Set<TeamState>([
            "operator-is-reading-question", "can-answer"
        ]);

        window.addEventListener("keydown", keyboardEvent => {
            if (!this.teamArray) {
                // Ignore if teams have not been initialized yet
                return;
            }
            if (!this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.has(keyboardEvent.key)) {
                // Ignore keys that do not correspond to team numbers
                return;
            }
            if (keyboardEvent.repeat) {
                // Ignore events fired from the key being held down
                return;
            }

            const teamNumber = Number(keyboardEvent.key);
            const teamIndex = teamNumber - 1;
            const team = this.teamArray[teamIndex];
            team.showKeyboardKeyDown();

            const teamState = team.getState();

            if (this.presentClue) {
                if (teamStatesWhereBuzzingDoesSomething.has(teamState)) {
                    // Do not do anything. The history will be recorded by a dedicated method in Operator.
                } else if (teamState === "idle") {
                    // Ignore, we don't need it to appear in the history chart.
                } else {
                    this.buzzHistoryForClue?.RECORDS[teamIndex].push({
                        startTimestamp: Date.now(),
                        RESULT: {
                            TYPE: "ignored",
                            TEAM_STATE_WHY_IT_WAS_IGNORED: teamState
                        }
                    });
                }
            }

        });

        window.addEventListener("keyup", keyboardEvent => {
            if (this.teamArray && this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.has(keyboardEvent.key)) {
                const teamNumber = Number(keyboardEvent.key);
                const teamIndex = teamNumber - 1;
                const team = this.teamArray[teamIndex];
                team.showKeyboardKeyUp();
            }
        });
    }

    private initKeyboardListenerToPause(): void {
        window.addEventListener("keydown", keyboardEvent => {
            if (keyboardEvent.key.toLowerCase() === "p" && document.activeElement?.tagName !== "INPUT") {
                this.togglePaused();
            }
        });
    }

    /**
     * Called from the state machine when the human operator presses the 'Y' key.
     */
    public onAnswerCorrect(): void {
        if (!this.presentClue) {
            throw new Error("called onAnswerCorrect() when presentClue is undefined");
        }
        if (!this.teamPresentlyAnswering) {
            throw new Error("called onAnswerCorrect() when teamPresentlyAnswering is undefined");
        }
        this.teamPresentlyAnswering.onAnswerCorrect(this.presentClue);
        this.buzzHistoryPopulateRecordForActiveAnswerAndSave("answeredRight");

        if (this.SETTINGS.teamToChooseNextClue === "previousCorrectAnswer") {
            this.teamIndexToPickClue = this.teamPresentlyAnswering.getTeamIndex();
        }

        this.setStatesOfTeamsNotAnswering("can-answer"); //only correct if teams can answer multiple questions for the same clue
        this.teamPresentlyAnswering = undefined;
    }

    /**
     * Called from the state machine when either the human operator presses the 'N' key, or a
     * team runs out of time to answer after buzzing.
     */
    public onAnswerWrongOrTimeout(): void {
        if (!this.presentClue) {
            throw new Error("called handleAnswerWrongOrTimeout() when presentClue is undefined");
        }
        this.teamPresentlyAnswering?.onAnswerIncorrectOrAnswerTimeout(this.presentClue);

        // finish adding info to object which was started when the buzzer was pressed (in method startAnswer())
        this.buzzHistoryPopulateRecordForActiveAnswerAndSave("answeredWrongOrTimedOut");

        this.stateMachine?.getCountdownTimerForState("waitForTeamAnswer").showProgressBarFinished();

        this.setStatesOfTeamsNotAnswering("can-answer"); //only correct if teams can answer multiple questions for the same clue
        this.teamPresentlyAnswering = undefined;
    }

    private setStatesOfTeamsNotAnswering(targetState: TeamState): void {
        if (!this.teamPresentlyAnswering) {
            throw new Error("called setStatesOfTeamsNotAnswering() when teamPresentlyAnswering is undefined");
        }
        if (!this.teamArray) {
            throw new Error("called setStatesOfTeamsNotAnswering() when teamArray is undefined");
        }

        const indexOfTeamPresentlyAnswering = this.teamPresentlyAnswering.getTeamIndex();
        for (let i = 0; i < this.teamCount; i++) {
            if (i !== indexOfTeamPresentlyAnswering) {
                this.teamArray[i].setState(targetState);
            }
        }
    }

    private buzzHistoryPopulateRecordForActiveAnswerAndSave(answerResult: BuzzAnswerResult): void {
        if (this.presentClue && this.buzzHistoryRecordForActiveAnswer && this.teamPresentlyAnswering) {
            this.buzzHistoryRecordForActiveAnswer.RESULT.endTimestamp = Date.now();
            this.buzzHistoryRecordForActiveAnswer.RESULT.answerResult = answerResult;

            this.buzzHistoryForClue?.RECORDS[this.teamPresentlyAnswering.getTeamIndex()]
                .push(this.buzzHistoryRecordForActiveAnswer);

            this.buzzHistoryRecordForActiveAnswer = undefined;
        }
    }

    private initMouseListeners(): void {
        this.BUTTON_START_GAME.addEventListener("click", () => this.gameStart());

        this.BUTTON_SKIP_CLUE.addEventListener("click", () => { if (!this.isPaused()) this.clueSkip(); });

        this.BUTTON_ADD_TIME_TO_GAME_ROUND_TIMER.addEventListener("click", () => {
            this.GAME_ROUND_TIMER.addTime(60 * 1000);
        });

        querySelectorAndCheck(document, "a#aMoneyOverride").addEventListener("click", () =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney"));


        querySelectorAndCheck(document, "a#aOpenStateMachineHistoryVisualizer").addEventListener("click", () =>
            window.open("../stateMachineHistoryVisualizer", "windowStateMachineHistoryVisualizer", "popup")
        );

        querySelectorAndCheck(this.DIV_GAME_END_POPUP_BUTTONS, "button#show-team-ranking-table").addEventListener("click", () => {
            this.presentation?.showSlide("slide-gameEnd-team-ranking-table");
            this.DIV_GAME_END_POPUP.setAttribute("data-show-game-end-item", "team-ranking-table");
        });

        querySelectorAndCheck(this.DIV_GAME_END_POPUP_BUTTONS, "button#show-money-over-time-line-chart").addEventListener("click", () => {
            this.presentation?.showSlide("slide-gameEnd-line-chart");
            this.DIV_GAME_END_POPUP.setAttribute("data-show-game-end-item", "line-chart");
        });

        querySelectorAndCheck(this.DIV_GAME_END_POPUP_BUTTONS, "button#show-buzz-results-pie-charts").addEventListener("click", () => {
            this.presentation?.showSlide("slide-gameEnd-pie-charts");
            this.DIV_GAME_END_POPUP.setAttribute("data-show-game-end-item", "pie-charts");
        });

        const teamCountNumberInput = querySelectorAndCheck<HTMLInputElement>(document, "input#team-count");
        teamCountNumberInput.value = String(this.teamCount);
        querySelectorAndCheck(document, "button#apply-team-count").addEventListener("click", () => {
            const newTeamCount = Number(teamCountNumberInput.value);
            if (newTeamCount !== this.teamCount) {
                this.teamCount = newTeamCount;
                this.initTeams();
            }
        });

        querySelectorAndCheck(document, "button#reset-team-names").addEventListener("click", () => {
            if (this.teamArray && this.teamNameInputElements) {
                if (window.confirm("Erase all the team names and reset them all to default?")) {
                    for (let teamIdx = 0; teamIdx < this.teamCount; teamIdx++) {
                        const name = `Team ${teamIdx + 1}`;
                        this.teamNameInputElements[teamIdx].value = name;
                        this.teamArray[teamIdx].setTeamName(name);
                    }
                }
            }
        });

        querySelectorAndCheck(document, "button#nextRoundOrEndGame").addEventListener("click", () => {
            this.stateMachine?.goToState("nextRoundOrEndGame");
            //go to the Play tab
            querySelectorAndCheck<HTMLInputElement>(document, "input#tab-play").checked = true;
        });

        querySelectorAndCheck(document, "button#finalJeopardy").addEventListener("click", () => {
            this.stateMachine?.goToState("finalJeopardyIntro");
            //go to the Play tab
            querySelectorAndCheck<HTMLInputElement>(document, "input#tab-play").checked = true;
        });

        querySelectorAndCheck(document, "button#endGame").addEventListener("click", () => {
            this.stateMachine?.goToState("gameEnd");
        });
    }

    /**
     * Called when the human operator clicks the "start game" button.
     */
    private gameStart(): void {
        this.stateMachine?.manualTrigger("startGame");
        this.BUTTON_START_GAME.setAttribute("disabled", "disabled");
        this.BUTTON_ADD_TIME_TO_GAME_ROUND_TIMER.removeAttribute("disabled");
    }


    /**
     * Called when the human operator clicks the "skip clue" button.
     */
    public clueSkip(): void {
        this.setAllTeamsState("idle", true); // the second argument is endLockout
        this.BUTTON_SKIP_CLUE.setAttribute("disabled", "disabled");
        this.BUTTON_SKIP_CLUE.blur();

        if (this.gameBoard?.isAllCluesRevealedThisRound()) {
            this.stateMachine?.goToState("nextRoundOrEndGame");
        } else {
            this.stateMachine?.goToState("showGameBoard");
        }
    }

    private initTeams(): void {
        if (!this.presentation) {
            throw new Error("called initTeams() when presentation is undefined");
        }

        const table = querySelectorAndCheck(document, "table#team-names tbody");
        table.innerHTML = "";

        this.teamArray = [];
        this.teamNameInputElements = [];
        querySelectorAndCheck(document, "footer").innerHTML = "";
        this.presentation.footerClear();

        this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.clear();
        for (let teamIndex = 0; teamIndex < this.teamCount; teamIndex++) {
            const newTeam = new Team(teamIndex, this, this.presentation, this.SETTINGS, this.AUDIO_MANAGER);
            this.teamArray.push(newTeam);

            const tr = document.createElement("tr");

            const teamNumberString = String(teamIndex + 1);
            const tdTeamNumber = document.createElement("td");
            tdTeamNumber.innerText = teamNumberString;
            tr.append(tdTeamNumber);

            const tdTeamNameInputContainer = document.createElement("td");
            const inputTeamName = document.createElement("input");
            inputTeamName.type = "text";
            inputTeamName.value = newTeam.getTeamName();
            inputTeamName.addEventListener("input", () => {
                const newName = inputTeamName.value;
                newTeam.setTeamName(newName);
                this.buzzHistoryChart?.setTeamName(teamIndex, newName);
            });
            this.teamNameInputElements.push(inputTeamName);
            tdTeamNameInputContainer.append(inputTeamName);
            tr.append(tdTeamNameInputContainer);

            table.append(tr);

            this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.add(teamNumberString);
        }

        this.buzzHistoryChart = new BuzzHistoryChart(
            this.teamArray,
            this.SETTINGS.durationLockoutMillisec,
            querySelectorAndCheck(document, "svg#buzz-history"),
            this.presentation.getBuzzHistorySvg()
        );

    }

    public getKeyboardKeysForTeamNumbers(): Set<string> {
        return this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS;
    }

    public playSoundQuestionTimeout(): void {
        this.AUDIO_MANAGER.QUESTION_TIMEOUT.play();
    }

    /**
     * Called from the state machine after a team buzzes in.
     */
    public teamAnswerStart(keyboardEvent?: KeyboardEvent): void {
        if (!this.teamArray) {
            throw new Error("called handleBuzzerPress() when teamArray is undefined");
        }
        if (!keyboardEvent) {
            throw new Error("called handleBuzzerPress() without a keyboardEvent");
        }
        if (!this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.has(keyboardEvent.key)) {
            return;
        }

        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        this.teamPresentlyAnswering = this.teamArray[teamIndex];

        this.teamPresentlyAnswering.answerStart();
        this.setStatesOfTeamsNotAnswering("other-team-is-answering");

        this.AUDIO_MANAGER.TEAM_BUZZ.play();

        this.buzzHistoryRecordForActiveAnswer = {
            startTimestamp: Date.now(),
            RESULT: {
                TYPE: "start-answer",
                answerResult: "answeredWrongOrTimedOut", //changed later if they answer right
                endTimestamp: NaN
            }
        };
    }

    public isGameRoundOver(): boolean {
        if (this.gameBoard) {
            return this.GAME_ROUND_TIMER.isFinished() || this.gameBoard?.isAllCluesRevealedThisRound();
        } else {
            throw new Error("called isGameRoundOver() when the gameBoard has not been set");
        }
    }

    /**
     * Called from the state machine when a team presses their buzzer
     * while the human operator is reading the question out loud.
     */
    public onTeamLockout(keyboardEvent: KeyboardEvent): void {
        if (!this.teamArray) {
            throw new Error("called handleLockout() when teamArray is undefined");
        }
        if (!this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.has(keyboardEvent.key)) {
            return;
        }

        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        const team = this.teamArray[teamIndex];
        if (team.canBeLockedOut()) {
            team.lockoutStart();

            this.buzzHistoryForClue?.RECORDS[teamIndex].push({
                startTimestamp: Date.now(),
                RESULT: { TYPE: "too-early-start-lockout" }
            });
        }

    }

    private clueShowToOperator(clue: RevealedClue): void {
        /*
        This function only shows the category, and dollar value to the operator.
        The state machine will show the clue question after a timeout.
        */
        this.DIV_CLUE_WRAPPER.style.display = ""; //show it by removing "display=none"
        this.DIV_CLUE_CATEGORY.innerHTML = clue.CATEGORY_NAME;
        this.DIV_CLUE_VALUE.innerHTML = `$${clue.VALUE}`;
        this.TR_ANSWER.style.display = "none";
    }

    private setPresentClue(clue: RevealedClue): void {
        this.presentClue = clue;

        this.buzzHistoryForClue = {
            RECORDS: getEmpty2DArray(this.teamCount),
            timestampWhenClueQuestionFinishedReading: NaN
        };

        function getEmpty2DArray(size: number): BuzzHistoryRecord<BuzzResult>[][] {
            /*
             Do not use array.fill([]) because it creates one new empty array and sets
             all the elements to that empty array.
             */
            const rv = new Array<BuzzHistoryRecord<BuzzResult>[]>(size);
            for (let teamIdx = 0; teamIdx < size; teamIdx++) {
                rv[teamIdx] = [];
            }
            return rv;
        }

        this.clueShowToOperator(clue);
        this.presentation?.setClue(clue);

    }


    /**
     * The game board is the table of categories and dollar values.
     */
    public gameBoardShow(): void {
        this.DIV_GAME_BOARD_WRAPPER.style.display = ""; //show it by removing display=none

        this.DIV_CLUE_WRAPPER.style.display = "none";

        this.presentation?.setHeaderDisplayMinimized();

        this.teamArray?.[this.teamIndexToPickClue].choosingClueSet();
    }

    public gameBoardHide(): void {
        this.DIV_GAME_BOARD_WRAPPER.style.display = "none";
        this.presentation?.setHeaderDisplayFull();

        this.teamArray?.[this.teamIndexToPickClue].choosingClueClear();
    }

    /**
     * Called when the human operator clicks on a cell in the game board table.
     */
    public onGameBoardClueClicked(clue: RevealedClue): void {
        this.stateMachine?.getCountdownTimerForState("showClueCategoryAndValue").reset();

        this.BUTTON_START_GAME.blur();
        this.TR_QUESTION.style.display = "none";

        this.setPresentClue(clue);
        this.stateMachine?.manualTrigger("userChoseClue");
    }

    public teamTimedOutChoosingClue(): void {
        const randomUnrevealedClue = this.gameBoard!.getRandomAvailableClue();
        this.onGameBoardClueClicked(randomUnrevealedClue);
    }

    /** Called from the state machine */
    public onShowClueCategoryAndValue(): void {
        this.BUTTON_SKIP_CLUE.removeAttribute("disabled");
    }

    /*
    A prompt is shown to the operator which says "press space to show info about
    this special category.
    */
    private specialCategoryPromptShow(specialCategory: SpecialCategory): void {
        this.SPAN_SPECIAL_CATEGORY_PROMPT_TITLE.innerHTML = specialCategory.DISPLAY_NAME;
        this.DIV_SPECIAL_CATEGORY_PROMPT.style.display = "block";
    }

    private specialCategoryPromptHide(): void {
        this.DIV_SPECIAL_CATEGORY_PROMPT.style.display = "none";
    }


    /**
     * A category is special if it has special rules or need extra explanation.
     */
    public specialCategoryPopupShow(): void {
        this.GAME_ROUND_TIMER.pause();

        const specialCategory = this.categoryCarouselGetSpecialCategory();
        if (!specialCategory) {
            throw new Error("called showSpecialCategoryOverlay() when the present clue does not have a special category");
        }

        this.presentation?.specialCategoryPopupShow(specialCategory);

        this.SPECIAL_CATEGORY_POPUP_TITLE.innerHTML = specialCategory.DISPLAY_NAME;
        this.SPECIAL_CATEGORY_POPUP_DESCRIPTION.innerHTML = specialCategory.DESCRIPTION;
        if (specialCategory.EXAMPLE) {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.remove("no-example");
            this.SPECIAL_CATEGORY_POPUP_EXAMPLE_CATEGORY.innerHTML = specialCategory.EXAMPLE.CATEGORY;
            this.SPECIAL_CATEGORY_POPUP_EXAMPLE_QUESTION.innerHTML = specialCategory.EXAMPLE.QUESTION;
            this.SPECIAL_CATEGORY_POPUP_EXAMPLE_ANSWER.innerHTML = specialCategory.EXAMPLE.ANSWER;
        } else {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.add("no-example");
        }

        this.DIV_SPECIAL_CATEGORY_POPUP.setAttribute("data-popup-visibility", "visible");
        this.backdropForPopupsShow();
    }

    public specialCategoryPopupHide(): void {
        this.backdropForPopupsHide();
        this.DIV_SPECIAL_CATEGORY_POPUP.setAttribute("data-popup-visibility", "hidden");
        this.presentation?.specialCategoryPopupHide();
        this.GAME_ROUND_TIMER.resume();
    }


    /**
     * Called from the state machine.
     */
    public onShowClueQuestion(): void {
        if (!this.presentClue) {
            throw new Error("called handleShowClueQuestion() when presentClue is undefined");
        }

        /*
        This method mostly is about showing the clue question to the operator.
        The clue question is already being shown in the presentation because
        the state machine changes the slide.
        */
        this.setAllTeamsState("operator-is-reading-question");

        this.DIV_CLUE_QUESTION.innerHTML = this.getQuestionHtmlWithSubjectInBold(this.presentClue.QUESTION);
        this.TR_QUESTION.style.display = ""; //show it by removing "display=none"
        this.TR_ANSWER.style.display = "none";

        // this.specialCategoryPromptHide();
    }

    private getQuestionHtmlWithSubjectInBold(question: string): string {
        /*
        The person reading the question out loud should emphasize the subject
        of the question. This function searches for words that are probably
        the subject and makes them bold.
        In the regex, \b means word boundary.
        */
        const regex = /\b((this)|(these)|(her)|(his)|(she)|(he)|(here))\b/ig;

        // "$&" is the matched substring
        return question.replace(regex, '<span class="clue-keyword">$&</span>');

    }

    /**
     * Called from the state machine.
     */
    public onDoneReadingClueQuestion(): void {
        if (!this.presentClue) {

            throw new Error("called handleDoneReadingClueQuestion() when presentClue is undefined");
        }
        this.AUDIO_MANAGER.DONE_READING_CLUE_QUESTION.play();
        this.TR_ANSWER.style.display = ""; //show it by removing "display=none"
        this.DIV_CLUE_ANSWER.innerHTML = this.presentClue.ANSWER;
        this.setAllTeamsState("can-answer");
        this.BUTTON_SKIP_CLUE.setAttribute("disabled", "disabled");

        this.stateMachine?.getCountdownTimerForState("waitForBuzzes").reset();

        this.teamArray?.forEach(team => team.resetHasBuzzedForCurrentQuestion());

        if (this.buzzHistoryForClue) {
            this.buzzHistoryForClue.timestampWhenClueQuestionFinishedReading = Date.now();
        }
    }

    /**
     * Called from the state machine.
     */
    public onShowAnswer(): void {

        // only save the game if somebody has more than $0
        if (this.teamArray?.some(team => team.getMoney() > 0)) {
            this.gameSave();
        }

        this.stateMachine?.getCountdownTimerForState("waitForBuzzes").showProgressBarFinished();
        this.stateMachine?.getCountdownTimerForState("waitForTeamAnswer").showProgressBarFinished();

        this.setAllTeamsState("idle");

        this.teamArray?.forEach(team => {
            team.statisticsUpdateMoneyAtEndOfRound();
        });

        this.presentation?.hideQuestionInAnswerSlide();

        this.questionCountForPieCharts++;

        if (this.SETTINGS.teamToChooseNextClue === "rotate") {
            if (this.teamIndexToPickClue === this.teamCount - 1) {
                this.teamIndexToPickClue = 0;
            } else {
                this.teamIndexToPickClue++;
            }
        }
    }

    public setAllTeamsState(targetState: TeamState, endLockout = false): void {
        this.teamArray?.forEach(team => team.setState(targetState, endLockout));
    }

    public teamCanBuzz(keyboardEvent: KeyboardEvent): boolean {
        if (!this.teamArray) {
            throw new Error("called canTeamBuzz() when teamArray is null");
        }

        if (this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.has(keyboardEvent.key)) {
            const teamNumber = Number(keyboardEvent.key);
            const teamIndex = teamNumber - 1;
            return this.teamArray[teamIndex].canBuzz();
        } else {
            return false;
        }
    }

    public isAllTeamsAnswered(): boolean {
        if (!this.teamArray) {
            return false;
        }
        if (this.SETTINGS.allowMultipleAnswersToSameQuestion) {
            // allow teams to keep answering until time runs out
            return false;
        } else {
            // each team only gets one try to answer a question
            return this.teamArray.every(team => team.getState() === "already-answered-this-clue");
        }
    }

    public togglePaused(): void {
        this.setPaused(!this.isPaused_);
    }

    public setPaused(isPaused: boolean): void {
        this.isPaused_ = isPaused;
        this.DIV_PAUSED.style.display = isPaused ? "" : "none";
        this.stateMachine?.setPaused(isPaused);
        this.GAME_ROUND_TIMER.setPaused(isPaused);
        this.teamArray?.forEach(team => team.setPaused(isPaused));
        this.presentation?.setPaused(isPaused);

        if (isPaused) {
            document.body.classList.add("paused");
            this.gameBoard?.onGamePause();
        } else {
            document.body.classList.remove("paused");
        }

    }

    public isPaused(): boolean {
        return this.isPaused_;
    }

    public getTeam(teamIdx: number): Team {
        if (!this.teamArray) {
            throw new Error("getting team when teamArray is not defined");
        }
        return this.teamArray[teamIdx];
    }

    private lookForSavedGame(): void {

        const divMessage = querySelectorAndCheck(document, "div#saved-game-message");

        const rawLocalStorageResult = window.localStorage.getItem(Operator.LOCAL_STORAGE_KEY);
        if (rawLocalStorageResult === null) {
            divMessage.innerHTML = "No saved game found in localStorage.";
            return;
        }

        divMessage.innerHTML = "Found a saved game:";

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedJson: SavedGameInLocalStorage = JSON.parse(rawLocalStorageResult);

        const tableDetails = querySelectorAndCheck(document, "table#saved-game-details tbody");

        const tableRowTeamNumber = document.createElement("tr");
        tableDetails.append(tableRowTeamNumber);
        parsedJson.TEAMS.forEach(team => {
            const cellTeamNumber = document.createElement("td");
            cellTeamNumber.innerHTML = team.TEAM_NAME;
            tableRowTeamNumber.append(cellTeamNumber);
        });

        const tableRowTeamMoney = document.createElement("tr");
        tableDetails.append(tableRowTeamMoney);
        parsedJson.TEAMS.forEach(team => {
            const cellTeamMoney = document.createElement("td");
            cellTeamMoney.innerHTML = `$${team.MONEY}`;
            tableRowTeamMoney.append(cellTeamMoney);
        });

        const divSavedGame = querySelectorAndCheck(document, "div#tab-content-load-game");

        querySelectorAndCheck(document, "button#saved-game-load").addEventListener("click", () => {
            this.gameLoad(parsedJson);
            divSavedGame.style.display = "none";
        });

        querySelectorAndCheck(document, "button#saved-game-delete").addEventListener("click", function () {
            if (window.confirm("Delete the saved game?")) {
                window.localStorage.removeItem(Operator.LOCAL_STORAGE_KEY);
                divSavedGame.style.display = "none";
            }
        });
    }

    private gameSave(): void {
        if (!this.teamArray) {
            throw new Error("called saveGame() when teamArray is undefined");
        }
        const objectToSave: SavedGameInLocalStorage = {
            GAME_ROUND_TIMER_REMAINING_MILLISEC: this.GAME_ROUND_TIMER.getRemainingMillisec(),
            TEAMS: this.teamArray.map(t => t.getObjectToSaveInLocalStorage())
        };

        window.localStorage.setItem(
            Operator.LOCAL_STORAGE_KEY,
            JSON.stringify(objectToSave)
        );
        //TODO save the settings
    }

    private gameLoad(parsedJson: SavedGameInLocalStorage): void {

        // gameBoard.cluesNotYetRevealedThisRound does not get set which beaks this!!!

        this.GAME_ROUND_TIMER.setRemainingMillisec(parsedJson.GAME_ROUND_TIMER_REMAINING_MILLISEC);

        this.teamCount = parsedJson.TEAMS.length;
        this.initTeams();
        for (let teamIdx = 0; teamIdx < this.teamCount; teamIdx++) {
            const team = parsedJson.TEAMS[teamIdx];
            this.teamArray![teamIdx].loadFromLocalStorage(team);
            this.buzzHistoryChart?.setTeamName(teamIdx, team.TEAM_NAME);
        }

        if (this.isGameRoundOver()) {
            this.stateMachine?.goToState("gameEnd");
        }
    }

    /**
     * Called from the state machine.
     */
    public onGameEnd(): void {
        this.GAME_ROUND_TIMER.pause();

        // First play the eight high-pitched beeps sound, then play the closing music
        this.AUDIO_MANAGER.playInOrder(
            this.AUDIO_MANAGER.ROUND_END,
            this.AUDIO_MANAGER.MUSIC_GAME_END
        );

        this.presentation?.headerAndFooterHide();

        this.backdropForPopupsShow();
        this.DIV_GAME_END_POPUP.setAttribute("data-popup-visibility", "visible");

        const teamRankingTableHtml = this.getGameEndTeamRankingTableHtml();
        this.DIV_GAME_END_TEAM_RANKING_WRAPPER.innerHTML = teamRankingTableHtml;
        this.presentation?.setGameEndTeamRankingHtml(teamRankingTableHtml);

        if (this.teamArray) {

            createGameEndPieChartsOfBuzzResults(this, this.DIV_GAME_END_PIE_CHARTS, this.teamArray, true);

            createGameEndLineChartOfMoneyOverTime(this.DIV_GAME_END_LINE_CHART, this.teamArray, true);

            if (this.presentation) {
                createGameEndPieChartsOfBuzzResults(this, this.presentation.getGameEndPieChartContainer(), this.teamArray);
                createGameEndLineChartOfMoneyOverTime(this.presentation.getGameEndLineChartContainer(), this.teamArray);
            }
        }
    }

    private getGameEndTeamRankingTableHtml(): string {
        if (!this.teamArray) {
            throw new Error("called createTeamRankingTable() when teamArray is undefined");
        }

        // sort teams by money descending
        const shallowCopy = this.teamArray.slice();
        function comparator(team1: Team, team2: Team): number {
            return team2.getMoney() - team1.getMoney();
        }
        shallowCopy.sort(comparator);

        const html: string[] = [];
        html.push("<table><tbody>");

        shallowCopy.forEach(team => html.push(
            `
            <tr>
            <td>${team.getTeamName()}</td>
            <td>$${team.getMoney().toLocaleString()}</td>
            </tr>
            `
        ));

        html.push("</tbody></table>");

        return html.join("");
    }

    /**
     * Called from the state machine.
     * 
     * Buzz history is for each clue. It shows a timeline of when teams buzzed in.
     */
    public onBuzzHistoryShow(): void {
        if (this.buzzHistoryForClue && this.buzzHistoryChart) {
            this.GAME_ROUND_TIMER.pause();

            this.backdropForPopupsShow();
            this.DIV_BUZZ_HISTORY_POPUP.setAttribute("data-popup-visibility", "visible");

            this.buzzHistoryChart.showNewHistory(this.buzzHistoryForClue);
        }
    }

    /*
    The backdrop slightly blurs everything behind the popup.
    */
    private backdropForPopupsShow(): void {
        this.DIV_BACKDROP_FOR_POPUPS.setAttribute("data-backdrop-state", "enabled");
    }

    private backdropForPopupsHide(): void {
        this.DIV_BACKDROP_FOR_POPUPS.setAttribute("data-backdrop-state", "disabled");
    }

    /**
     * Called from the state machine.
     * 
     * Buzz history is for each clue. It shows a timeline of when teams buzzed in.
     */
    public onBuzzHistoryHide(): void {
        this.GAME_ROUND_TIMER.resume();
        this.backdropForPopupsHide();
        this.DIV_BUZZ_HISTORY_POPUP.setAttribute("data-popup-visibility", "hidden");
    }

    public getStateMachine(): StateMachine | undefined {
        return this.stateMachine;
    }

    public getTeamArray(): Team[] | undefined {
        return this.teamArray;
    }

    public getQuestionCountForPieCharts(): number {
        return this.questionCountForPieCharts;
    }

    public setInstructionsHtml(text: string): void {
        this.DIV_INSTRUCTIONS.innerHTML = text;
    }

    public buzzHistoryShouldShow(): boolean {
        if (this.teamArray) {
            return this.teamArray.some(t => t.hasBuzzedForCurrentQuestion());
        } else {
            throw new Error("called shouldShowBuzzHistory() when teamArray is undefined");
        }
    }

    /**
     * Called from the state machine.
     * 
     * The category carousel appears at the beginning of each game round. It shows each category
     * full-screen to the players one at a time.
     */
    public categoryCarouselStart(): void {
        this.categoryCarouselIndex = 0;
        this.presentation?.headerAndFooterHide();
        this.presentation?.setCategoryCarouselIndex(this.categoryCarouselIndex);
        this.categoryCarouselShowText();
    }

    /**
     * Called from the state machine
     */
    public categoryCarouselStop(): void {
        this.specialCategoryPromptHide();
        this.presentation?.headerAndFooterShow();
        this.GAME_ROUND_TIMER.start();
    }

    public categoryCarouselHasMore(): boolean {
        return this.categoryCarouselIndex < GameBoard.TABLE_COLUMN_COUNT - 1;
    }

    /**
     * A category is special if it has special rules or need extra explanation.
     */
    public categoryCarouselIsSpecialCategory(): boolean {
        return this.categoryCarouselGetSpecialCategory() !== undefined;
    }

    public categoryCarouselGetSpecialCategory(): SpecialCategory | undefined {
        return SCRAPED_GAME.ROUNDS[this.gameRoundIndex].CATEGORIES[this.categoryCarouselIndex].specialCategory;
    }

    /**
     * Called from the state machine
     */
    public categoryCarouselShowNext(): void {
        this.categoryCarouselIndex++;
        this.presentation?.setCategoryCarouselIndex(this.categoryCarouselIndex);

        this.categoryCarouselShowText();
    }

    private categoryCarouselShowText(): void {
        const category = SCRAPED_GAME.ROUNDS[this.gameRoundIndex].CATEGORIES[this.categoryCarouselIndex];

        const specialCategory = this.categoryCarouselGetSpecialCategory();
        if (specialCategory === undefined) {
            this.specialCategoryPromptHide();
        } else {
            this.specialCategoryPromptShow(specialCategory);
        }

        let instructionsHtml = `Read this category out loud:<p>Category ${this.categoryCarouselIndex + 1} of ${GameBoard.TABLE_COLUMN_COUNT}: "${category.NAME}".<p>`;

        if (category.COMMENT_FROM_TV_SHOW_HOST) {

            /*
            On J-Archive, category comments contain parentheses and speaker names.
            Here are examples of particularly complex comments with multiple speakers:

            Category: "genius: Aretha"
            Comment: "(Cynthia Erivo: I'm Cynthia Erivo with clues about Aretha Franklin whose genius is captured in
            a new \"National Geographic\" series.) (David Faber: The full season of National Geographic's Genius:
            Aretha series is available on Hulu.)"
            Source: https://j-archive.com/showgame.php?game_id=7111
            
            Category: "extreme weather"
            Comment: "(Glen: I'm Glen Powell.) (Daisy: And I'm Daisy Edgar-Jones.) (Glen: We deal with some extreme weather
            in the new movie Twisters.) (Daisy: And now it's your turn to deal with some in the clues we present.)"
            Source: https://j-archive.com/showgame.php?game_id=8989

            I want to show only the body of the comment in the operator window, without parentheses and speaker names.

            Regular expression to do this:

            /     start of a regex literal
            \(    matches a literal open parenthesis character
            [^:]+ matches one or more of any character except colon
            :     matches a literal colon character
                  matches a literal space character
            (     start of a capture group
            [^)]+ matches one or more of any character except close parenthesis
            )     end of capture group
            \)    matches a literal close parenthesis character
            /     end of regex literal
            g     global search flag
            
            Then all occurrences with "$1" which inserts the capture group.

            Try it here: https://regexr.com/8cqpi
            If you get an error because the expression took too long to execute, add then remove a character in the search
            text or press one of the buttons in the RegExr page.

            */
            const regex = /\([^:]+: ([^)]+)\)/g;

            const cleanedComment = category.COMMENT_FROM_TV_SHOW_HOST.replaceAll(regex, "$1");

            instructionsHtml += `Comment from the TV show host: ${cleanedComment}<p>`;
        }

        if (this.categoryCarouselHasMore()) {
            this.DIV_INSTRUCTIONS.innerHTML = `${instructionsHtml} Press space to show the next category in the carousel.`;
        } else {
            this.DIV_INSTRUCTIONS.innerHTML = `${instructionsHtml} Press space to start the game.`;
        }
    }

    /**
     * Called from the state machine
     */
    public gameRoundStartNext(): void {
        this.gameRoundIndex++;
        const gameRound = SCRAPED_GAME.ROUNDS[this.gameRoundIndex];
        gameRound.CATEGORIES.forEach(category => category.specialCategory = checkSpecialCategory(category.NAME));
        this.gameBoard?.setGameRound(gameRound);
        this.DIV_CLUE_WRAPPER.style.display = "none";
        this.GAME_ROUND_TIMER.reset();

        this.presentation?.setCategoryCarouselGameRound(gameRound);
        this.presentation?.setHeaderDisplayMinimized(); //minimize header for the game board

        const messageLines = [`Get ready for round ${this.gameRoundIndex + 1}.`];
        if (this.gameRoundIndex === 0) {
            // example format of the airdate string: "Thursday, July 12, 2018"
            const split1 = SCRAPED_GAME.AIRDATE.split(", ");
            const year = split1[2];
            const monthAndDay = split1[1];
            const split2 = monthAndDay.split(" ");
            const month = split2[0];
            messageLines.push(`This game is from ${month} ${year}.`);
        }

        this.presentation?.setRoundStartHTML(messageLines.join("<br><br>"));

        messageLines.push("Press space to start the category carousel.");
        this.DIV_INSTRUCTIONS.innerHTML = messageLines.join("<br><br>");
    }

    public gameRoundHasMore(): boolean {
        return this.gameRoundIndex < SCRAPED_GAME.ROUNDS.length - 1;
    }

    public toggleQuestionInAnswerSlide(): void {
        this.presentation?.toggleQuestionInAnswerSlide();
    }

    public finalJeopardyStart(): void {
        this.presentation?.setClue({
            REVEALED_ON_TV_SHOW: true,
            QUESTION: SCRAPED_GAME.FINAL_JEOPARDY.QUESTION,
            ANSWER: SCRAPED_GAME.FINAL_JEOPARDY.ANSWER,
            VALUE: 0,
            CATEGORY_NAME: SCRAPED_GAME.FINAL_JEOPARDY.CATEGORY,
            ROW_INDEX: 0,
            COLUMN_INDEX: 0
        });
        this.presentation?.finalJeopardyStart();

        this.DIV_CLUE_WRAPPER.style.display = "none";

        querySelectorAndCheck(this.DIV_CLUE_WRAPPER, "tr#tr-clue-value").style.display = "none";
    }

    public finalJeopardyShowCategory(): void {
        this.DIV_CLUE_WRAPPER.style.display = ""; //show it by removing "display=none"
        this.DIV_CLUE_CATEGORY.innerHTML = SCRAPED_GAME.FINAL_JEOPARDY.CATEGORY;
        this.TR_QUESTION.style.display = "none";
        this.TR_ANSWER.style.display = "none";
    }

    public finalJeopardyShowQuestion(): void {
        this.TR_QUESTION.style.display = ""; //show it by removing "display=none"
        this.DIV_CLUE_QUESTION.innerHTML =
            this.getQuestionHtmlWithSubjectInBold(SCRAPED_GAME.FINAL_JEOPARDY.QUESTION);
    }

    public finalJeopardyShowWagersTable(): void {

        // Show the answer to the operator only
        this.TR_ANSWER.style.display = ""; //show it by removing "display=none"
        this.DIV_CLUE_ANSWER.innerHTML = SCRAPED_GAME.FINAL_JEOPARDY.ANSWER;

        this.presentation?.setFooterDisplayNone();

        const wagersTable = new FinalJeopardyWagersTable(this.teamArray!);

        const tableContainer = querySelectorAndCheck(document, "div#final-jeopardy-wagers-table-container");
        // tableContainer.append(document.createElement("br"));
        tableContainer.append(wagersTable.getTableForOperatorWindow());

        this.presentation?.finalJeopardyShowWagersTable(wagersTable.getTableForPresentationWindow());
    }

}
