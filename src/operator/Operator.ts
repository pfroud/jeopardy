import { AudioManager } from "../AudioManager";
import { BuzzHistoryChart, BuzzHistoryForClue, BuzzHistoryRecord, BuzzResult, BuzzResultStartAnswer } from "../BuzzHistoryChart";
import { CountdownTimer } from "../CountdownTimer";
import { GameBoard } from "../GameBoard";
import { Settings } from "../Settings";
import { Team, TeamSavedInLocalStorage, TeamState } from "../Team";
import { querySelectorAndCheck } from "../commonFunctions";
import { FullClue, ScrapedClue } from "../gameTypes";
import { Presentation } from "../presentation/Presentation";
import { SCRAPED_GAME } from "../scrapedGame";
import { SpecialCategory, checkSpecialCategory } from "../specialCategories";
import { StateMachine } from "../stateMachine/StateMachine";
import { createLineChartOfMoneyOverTime, createPieCharts } from "../statisticsCharts";

interface SavedGameInLocalStorage {
    readonly GAME_TIMER_REMAINING_MILLISEC: number,
    readonly TEAMS: readonly TeamSavedInLocalStorage[]
    // todo save the settings
}

export class Operator {
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
    private readonly DIV_SPECIAL_CATEGORY_PROMPT: HTMLDivElement;
    private readonly SPAN_SPECIAL_CATEGORY_TITLE: HTMLSpanElement;
    private readonly DIV_SPECIAL_CATEGORY_POPUP: HTMLDivElement;
    private readonly DIV_BUZZ_HISTORY_PROMPT: HTMLDivElement;
    private readonly DIV_BACKDROP_FOR_POPUPS: HTMLDivElement;
    private readonly SPECIAL_CATEGORY_TITLE: HTMLElement;
    private readonly SPECIAL_CATEGORY_DESCRIPTION: HTMLElement;
    private readonly SPECIAL_CATEGORY_EXAMPLE_CATEGORY: HTMLElement;
    private readonly SPECIAL_CATEGORY_EXAMPLE_QUESTION: HTMLElement;
    private readonly SPECIAL_CATEGORY_EXAMPLE_ANSWER: HTMLElement;
    private readonly DIV_GAME_END_CONTROLS: HTMLDivElement;
    private readonly DIV_STATISTICS_CHART_POPUP: HTMLDivElement;
    private readonly DIV_TEAM_RANKING_WRAPPER: HTMLDivElement;
    private readonly DIV_PIE_CHARTS: HTMLDivElement;
    private readonly DIV_LINE_CHART: HTMLDivElement;
    private readonly DIV_LINE_CHART_LEGEND: HTMLDivElement;

    private readonly GAME_TIMER: CountdownTimer; //not readonly because it may be changed when we load a game from localStorage
    private readonly KEYBOARD_KEYS_FOR_TEAM_NUMBERS = new Set<string>();
    private teamArray?: Team[];
    private teamNameInputElements?: HTMLInputElement[];
    private presentClue?: FullClue;

    private buzzHistoryForClue?: BuzzHistoryForClue;
    private presentation?: Presentation;
    private isPaused = false;
    private stateMachine?: StateMachine;
    private teamPresentlyAnswering?: Team | undefined;
    private buzzHistoryRecordForActiveAnswer?: BuzzHistoryRecord<BuzzResultStartAnswer> | undefined;
    private questionCount = 0;

    private gameRoundIndex = -1;

    private categoryCarouselIndex = 0;

    private buzzHistoryDiagram: BuzzHistoryChart | undefined;

    private readonly GAME_BOARD;

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
        this.DIV_BACKDROP_FOR_POPUPS = querySelectorAndCheck(document, "div#backdrop-for-popups");
        this.DIV_SPECIAL_CATEGORY_PROMPT = querySelectorAndCheck(document, "div#special-category-prompt");
        this.SPAN_SPECIAL_CATEGORY_TITLE = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_PROMPT, "span#special-category-title");
        this.DIV_BUZZ_HISTORY_PROMPT = querySelectorAndCheck(document, "div#buzz-history-chart-popup");
        this.DIV_SPECIAL_CATEGORY_POPUP = querySelectorAndCheck(document, "div#special-category-popup");
        this.SPECIAL_CATEGORY_TITLE = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, ".popup-title");
        this.SPECIAL_CATEGORY_DESCRIPTION = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-description");
        this.SPECIAL_CATEGORY_EXAMPLE_CATEGORY = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-category");
        this.SPECIAL_CATEGORY_EXAMPLE_QUESTION = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-question");
        this.SPECIAL_CATEGORY_EXAMPLE_ANSWER = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-answer");

        this.DIV_GAME_END_CONTROLS = querySelectorAndCheck<HTMLDivElement>(document, "div#game-end-controls");
        this.DIV_STATISTICS_CHART_POPUP = querySelectorAndCheck<HTMLDivElement>(document, "div#statistics-chart-popup");
        this.DIV_TEAM_RANKING_WRAPPER = querySelectorAndCheck(document, "div#team-ranking-wrapper");
        this.DIV_PIE_CHARTS = querySelectorAndCheck(document, "div#pie-charts");
        this.DIV_LINE_CHART = querySelectorAndCheck(document, "div#line-chart");
        this.DIV_LINE_CHART_LEGEND = querySelectorAndCheck(document, "div#line-chart-legend");


        this.initPauseKeyboardListener();
        this.initMouseListeners();
        this.lookForSavedGame();

        this.GAME_TIMER = new CountdownTimer(this.SETTINGS.gameTimeLimitMillisec);
        this.GAME_TIMER.addProgressElement(querySelectorAndCheck(document, "div#game-timer progress"));
        this.GAME_TIMER.addTextElement(querySelectorAndCheck(document, "div#game-timer div.remaining-time-text"));

        window.open("../presentation/presentation.html", "windowPresentation");

        this.GAME_BOARD = new GameBoard(this);
        this.GAME_BOARD.addTable(querySelectorAndCheck<HTMLTableElement>(document, "table#game-board"), "operator");


        /*
        The rest of the initialization happens in this.handlePresentationReady(),
        which gets called by the Presentation instance in the window we opened.
        */
    }

    public handlePresentationReady(presentationInstanceFromOtherWindow: Presentation): void {
        /* 
        This method gets called from the Presentation instance in the other window.
        */

        window.focus(); //focus the operator window

        this.presentation = presentationInstanceFromOtherWindow;
        this.initTeams();

        this.GAME_BOARD.addTable(this.presentation.getGameBoardTable(), "presentation");

        this.initKeyboardListenersForBuzzerFootswitchIcons();

        this.GAME_TIMER.addProgressElement(this.presentation.getProgressElementForGameTimer());

        this.stateMachine = new StateMachine(this.SETTINGS, this, this.presentation, this.AUDIO_MANAGER);

        this.BUTTON_START_GAME.removeAttribute("disabled");
        this.BUTTON_START_GAME.focus();
        this.DIV_INSTRUCTIONS.innerHTML = "Ready. Click the button to start the game.";

    }

    private initKeyboardListenersForBuzzerFootswitchIcons(): void {
        /*
        Show a small picture of the footswitch used for the buzzers so people can verify their buzzers are working.

        When a team presses the buzzer, what happens depends on what state the team is in.

        For most of the team states, pressing the buzzer does not do anything. No functions
        get called so we have to use this keyboard listener to record the history.

        There are only two team states in which something interesting happens when the buzzer is pressed.
        Both have dedicated methods in Operator which get called by the state machine:
          - If a team buzzes when in state "operator-is-reading-question", the state machine calls operator.handleLockout().
          - If a team buzzes when in state "can-answer", the state machine calls operator.startAnswer().
        */
        const teamStatesWhereBuzzingDoesSomething = new Set<TeamState>([
            "operator-is-reading-question", "can-answer"
        ]);

        window.addEventListener("keydown", keyboardEvent => {
            const keyboardKey = keyboardEvent.key;
            if (this.teamArray && this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.has(keyboardKey)) {
                const teamIndex = Number(keyboardKey) - 1;
                const team = this.teamArray[teamIndex];
                team.showKeyDown();

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
            }
        });

        window.addEventListener("keyup", keyboardEvent => {
            const keyboardKey = keyboardEvent.key;
            if (this.teamArray && this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.has(keyboardKey)) {
                const teamIndex = Number(keyboardKey) - 1;
                const team = this.teamArray[teamIndex];
                team.showKeyUp();
            }
        });
    }

    private initPauseKeyboardListener(): void {
        window.addEventListener("keydown", keyboardEvent => {
            if (keyboardEvent.key === "p" && document.activeElement?.tagName !== "INPUT") {
                this.togglePaused();
            }
        });
    }

    public handleAnswerCorrect(): void {
        if (!this.presentClue) {
            throw new Error("called handleAnswerCorrect() when presentClue is undefined");
        }
        this.teamPresentlyAnswering?.handleAnswerCorrect(this.presentClue);
        this.populateBuzzHistoryRecordForActiveAnswerAndSave(true);

        this.setStatesOfTeamsNotAnswering("can-answer"); //only correct if teams can answer multiple questions for the same clue
        this.teamPresentlyAnswering = undefined;
    }

    public handleAnswerWrongOrTimeout(): void {
        if (!this.presentClue) {
            throw new Error("called handleAnswerWrongOrTimeout() when presentClue is undefined");
        }
        this.teamPresentlyAnswering?.handleAnswerIncorrectOrAnswerTimeout(this.presentClue);

        // finish adding info to object which was started when the buzzer was pressed (in method startAnswer())
        this.populateBuzzHistoryRecordForActiveAnswerAndSave(false);

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

    private populateBuzzHistoryRecordForActiveAnswerAndSave(answeredCorrectly: boolean): void {
        if (this.presentClue && this.buzzHistoryRecordForActiveAnswer && this.teamPresentlyAnswering) {
            this.buzzHistoryRecordForActiveAnswer.RESULT.endTimestamp = Date.now();
            this.buzzHistoryRecordForActiveAnswer.RESULT.answeredCorrectly = answeredCorrectly;

            this.buzzHistoryForClue?.RECORDS[this.teamPresentlyAnswering.getTeamIndex()]
                .push(this.buzzHistoryRecordForActiveAnswer);

            this.buzzHistoryRecordForActiveAnswer = undefined;
        }
    }

    private initMouseListeners(): void {
        this.BUTTON_START_GAME.addEventListener("click", () => this.startGame());

        this.BUTTON_SKIP_CLUE.addEventListener("click", () => this.skipClue());

        querySelectorAndCheck(document, "a#aMoneyOverride").addEventListener("click", () =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney"));


        querySelectorAndCheck(document, "a#aOpenStateMachineViewer").addEventListener("click", () =>
            window.open("../stateMachineViewer", "windowStateMachineViewer", "popup")
        );

        const statisticsPopup = querySelectorAndCheck(document, "div#statistics-chart-popup");
        const gameEndControls = querySelectorAndCheck(document, "div#game-end-controls");
        querySelectorAndCheck(gameEndControls, "button#show-team-ranking-table").addEventListener("click", () => {
            this.presentation?.showSlide("slide-gameEnd-team-ranking-table");
            statisticsPopup.setAttribute("data-show-game-end-item", "team-ranking-table");
        });

        querySelectorAndCheck(gameEndControls, "button#show-money-over-time-line-chart").addEventListener("click", () => {
            this.presentation?.showSlide("slide-gameEnd-line-chart");
            statisticsPopup.setAttribute("data-show-game-end-item", "line-chart");
        });

        querySelectorAndCheck(gameEndControls, "button#show-buzz-results-pie-charts").addEventListener("click", () => {
            this.presentation?.showSlide("slide-gameEnd-pie-charts");
            statisticsPopup.setAttribute("data-show-game-end-item", "pie-charts");
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
    }

    private startGame(): void {
        this.stateMachine?.manualTrigger("startGame");
        this.BUTTON_START_GAME.setAttribute("disabled", "disabled");
        this.GAME_TIMER.start();
    }


    public skipClue(): void {
        this.setAllTeamsState("idle", true); // the second argument is endLockout
        this.BUTTON_SKIP_CLUE.setAttribute("disabled", "disabled");
        this.BUTTON_SKIP_CLUE.blur();
        this.stateMachine?.goToState("showGameBoard");
    }

    private initTeams(): void {
        if (!this.presentation) {
            throw new Error("called initTeams() when presentation is undefined");
        }

        const table = querySelectorAndCheck(document, "table#team-names tbody");
        table.innerHTML = "";

        this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.clear();
        for (let teamIndex = 0; teamIndex < this.teamCount; teamIndex++) {
            this.KEYBOARD_KEYS_FOR_TEAM_NUMBERS.add(String(teamIndex + 1));
        }

        this.teamArray = [];
        this.teamNameInputElements = [];
        querySelectorAndCheck(document, "footer").innerHTML = "";
        this.presentation.clearFooter();
        for (let teamIndex = 0; teamIndex < this.teamCount; teamIndex++) {
            const newTeam = new Team(teamIndex, this, this.presentation, this.SETTINGS, this.AUDIO_MANAGER);
            this.teamArray.push(newTeam);

            const tr = document.createElement("tr");

            const tdTeamNumber = document.createElement("td");
            tdTeamNumber.innerText = String(teamIndex + 1);
            tr.append(tdTeamNumber);

            const tdTeamNameInputContainer = document.createElement("td");
            const inputTeamName = document.createElement("input");
            inputTeamName.type = "text";
            inputTeamName.value = newTeam.getTeamName();
            inputTeamName.addEventListener("input", () => {
                const newName = inputTeamName.value;
                newTeam.setTeamName(newName);
                this.buzzHistoryDiagram?.setTeamName(teamIndex, newName);
            });
            this.teamNameInputElements.push(inputTeamName);
            tdTeamNameInputContainer.append(inputTeamName);
            tr.append(tdTeamNameInputContainer);

            table.append(tr);
        }

        this.buzzHistoryDiagram = new BuzzHistoryChart(
            this.teamArray,
            this.SETTINGS.durationLockoutMillisec,
            querySelectorAndCheck<SVGSVGElement>(document, "svg#buzz-history"),
            this.presentation.getBuzzHistorySvg()
        );

    }


    public playSoundQuestionTimeout(): void {
        this.AUDIO_MANAGER.QUESTION_TIMEOUT.play();
    }

    public startAnswer(keyboardEvent?: KeyboardEvent): void {
        if (!this.teamArray) {
            throw new Error("called handleBuzzerPress() when teamArray is undefined");
        }
        if (!keyboardEvent) {
            throw new Error("called handleBuzzerPress() without a keyboardEvent");
        }
        const teamNumberBuzzed = Number(keyboardEvent.key);
        const teamIndexBuzzed = teamNumberBuzzed - 1;
        const teamAnswering = this.teamArray[teamIndexBuzzed];

        this.teamPresentlyAnswering = teamAnswering;
        teamAnswering.startAnswer();
        this.setStatesOfTeamsNotAnswering("other-team-is-answering");

        this.AUDIO_MANAGER.TEAM_BUZZ.play();


        this.buzzHistoryRecordForActiveAnswer = {
            startTimestamp: Date.now(),
            RESULT: {
                TYPE: "start-answer",
                answeredCorrectly: false,
                endTimestamp: NaN
            }
        };
    }

    public isGameTimerOver(): boolean {
        return this.GAME_TIMER.getIsFinished();
    }

    public handleLockout(keyboardEvent: KeyboardEvent): void {
        if (!this.teamArray) {
            throw new Error("called handleLockout() when teamArray is undefined");
        }
        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        const team = this.teamArray[teamIndex];
        team.canBeLockedOut() && team.startLockout();

        this.buzzHistoryForClue?.RECORDS[teamIndex].push({
            startTimestamp: Date.now(),
            RESULT: { TYPE: "too-early-start-lockout" }
        });

    }

    private showClueToOperator(clue: FullClue, category: string, value: number): void {
        /*
        This function only shows the category, and dollar value to the operator.
        The state machine will show the clue question after a timeout.
        */
        this.DIV_CLUE_WRAPPER.style.display = ""; //show it by removing "display=none"
        this.DIV_CLUE_CATEGORY.innerHTML = category;
        this.DIV_CLUE_VALUE.innerHTML = `$${value}`;
        this.TR_ANSWER.style.display = "none";
    }

    private setPresentClue(clue: FullClue, category: string, value: number): void {
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

        this.showClueToOperator(clue, category, value);
        this.presentation?.setClue(clue, category, value);

        if (clue.SPECIAL_CATEGORY) {
            this.showSpecialCategoryPrompt(clue.SPECIAL_CATEGORY);
        }
    }

    public isCurrentClueSpecialCategory(): boolean {
        return this.presentClue?.SPECIAL_CATEGORY !== null;
    }

    public gameBoardShow(): void {
        this.GAME_BOARD.show();
        this.presentation?.minimizeHeader();
    }

    public gameBoardHide(): void {
        this.GAME_BOARD.hide();
        this.presentation?.maximizeHeader();
    }

    public gameBoardClueClicked(scrapedClue: ScrapedClue, categoryName: string, value: number): void {
        this.stateMachine?.getCountdownTimerForState("showClueCategoryAndValue").reset();

        this.BUTTON_START_GAME.blur();
        this.TR_QUESTION.style.display = "none";


        const fullClue: FullClue = {
            QUESTION: scrapedClue.QUESTION,
            ANSWER: scrapedClue.ANSWER,
            CATEGORY_NAME: categoryName,
            VALUE: value,
            SPECIAL_CATEGORY: checkSpecialCategory(categoryName)
        };
        this.setPresentClue(fullClue, categoryName, value);

        this.stateMachine?.manualTrigger("userChoseClue");
    }


    public fitClueQuestionToScreenInOperatorWindow(): void {
        this.presentation?.fitClueQuestionToScreen();
    }

    private showSpecialCategoryPrompt(specialCategory: SpecialCategory): void {
        this.SPAN_SPECIAL_CATEGORY_TITLE.innerHTML = specialCategory.DISPLAY_NAME;
        this.DIV_SPECIAL_CATEGORY_PROMPT.style.display = "block";
    }

    private hideSpecialCategoryPrompt(): void {
        this.DIV_SPECIAL_CATEGORY_PROMPT.style.display = "none";
    }

    public showSpecialCategoryOverlay(): void {
        this.GAME_TIMER.pause();

        const specialCategory = this.presentClue?.SPECIAL_CATEGORY;
        if (!specialCategory) {
            throw new Error("called showSpecialCategoryOverlay() when the present clue does not have a special category");
        }

        this.presentation?.showSpecialCategoryPopup(specialCategory);

        this.SPECIAL_CATEGORY_TITLE.innerHTML = specialCategory.DISPLAY_NAME;
        this.SPECIAL_CATEGORY_DESCRIPTION.innerHTML = specialCategory.DESCRIPTION;
        if (specialCategory.EXAMPLE) {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.remove("no-example");
            this.SPECIAL_CATEGORY_EXAMPLE_CATEGORY.innerHTML = specialCategory.EXAMPLE.CATEGORY;
            this.SPECIAL_CATEGORY_EXAMPLE_QUESTION.innerHTML = specialCategory.EXAMPLE.QUESTION;
            this.SPECIAL_CATEGORY_EXAMPLE_ANSWER.innerHTML = specialCategory.EXAMPLE.ANSWER;
        } else {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.add("no-example");
        }

        this.DIV_SPECIAL_CATEGORY_POPUP.style.display = "block";
        this.showBackdropForPopups();

    }

    public hideSpecialCategoryOverlay(): void {
        this.hideBackdropForPopups();
        this.DIV_SPECIAL_CATEGORY_POPUP.style.display = "none";
        this.presentation?.hideSpecialCategoryPopup();
        this.GAME_TIMER.resume();
    }

    public handleShowClueQuestion(): void {
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

        this.BUTTON_SKIP_CLUE.removeAttribute("disabled");

        this.hideSpecialCategoryPrompt();
    }

    private getQuestionHtmlWithSubjectInBold(question: string): string {
        /*
        The person reading the question out loud should emphasize the subject
        of the question. Look for words that are probably the subject and make them bold.
        \b means word boundary.
        */
        const regex = /\b((this)|(these)|(her)|(his)|(she)|(he)|(here))\b/ig;

        // "$&" is the matched substring
        return question.replace(regex, '<span class="clue-keyword">$&</span>');

    }

    public handleDoneReadingClueQuestion(): void {
        if (!this.presentClue) {

            throw new Error("called handleDoneReadingClueQuestion() when presentClue is undefined");
        }
        this.AUDIO_MANAGER.DONE_READING_CLUE_QUESTION.play();
        this.TR_ANSWER.style.display = ""; //show it by removing "display=none"
        this.DIV_CLUE_ANSWER.innerHTML = this.presentClue.ANSWER;
        this.setAllTeamsState("can-answer");
        this.BUTTON_SKIP_CLUE.setAttribute("disabled", "disabled");

        this.stateMachine?.getCountdownTimerForState("waitForBuzzes").reset();

        this.teamArray?.forEach(team => team.hasBuzzedForCurrentQuestion = false);

        if (this.buzzHistoryForClue) {
            this.buzzHistoryForClue.timestampWhenClueQuestionFinishedReading = Date.now();
        }
    }

    public handleShowAnswer(): void {

        // only save the game if somebody has more than $0
        if (this.teamArray?.some(team => team.getMoney() > 0)) {
            this.saveGame();
        }

        this.stateMachine?.getCountdownTimerForState("waitForBuzzes").showProgressBarFinished();
        this.stateMachine?.getCountdownTimerForState("waitForTeamAnswer").showProgressBarFinished();

        this.setAllTeamsState("idle");

        this.teamArray?.forEach(team => {
            team.updateMoneyAtEndOfRound();
            if (!team.hasBuzzedForCurrentQuestion) {
                team.statistics.questionsNotBuzzed++;
            }
        });

        this.questionCount++;

    }

    public setAllTeamsState(targetState: TeamState, endLockout = false): void {
        this.teamArray?.forEach(team => team.setState(targetState, endLockout));
    }

    public canTeamBuzz(keyboardEvent: KeyboardEvent): boolean {
        if (!this.teamArray) {
            throw new Error("called canTeamBuzz() when teamArray is null");
        }
        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        if (teamIndex > this.teamCount - 1) {
            return false;
        } else {
            return this.teamArray[teamIndex].canBuzz();
        }
    }

    public haveAllTeamsAnswered(): boolean {
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
        this.setPaused(!this.isPaused);
    }

    public setPaused(isPaused: boolean): void {
        this.isPaused = isPaused;
        this.DIV_PAUSED.style.display = isPaused ? "" : "none";
        this.stateMachine?.setPaused(isPaused);
        this.GAME_TIMER.setPaused(isPaused);
        this.teamArray?.forEach(team => team.setPaused(isPaused));
        this.presentation?.setPaused(isPaused);
    }

    public getIsPaused(): boolean {
        return this.isPaused;
    }

    public getTeam(teamIdx: number): Team | undefined {
        if (this.teamArray) {
            return this.teamArray[teamIdx];
        } else {
            return undefined;
        }
    }

    private lookForSavedGame(): void {

        const divMessage = querySelectorAndCheck<HTMLDivElement>(document, "div#saved-game-message");

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
        tableDetails.appendChild(tableRowTeamNumber);
        parsedJson.TEAMS.forEach(team => {
            const cellTeamNumber = document.createElement("td");
            cellTeamNumber.innerHTML = team.TEAM_NAME;
            tableRowTeamNumber.appendChild(cellTeamNumber);
        });

        const tableRowTeamMoney = document.createElement("tr");
        tableDetails.appendChild(tableRowTeamMoney);
        parsedJson.TEAMS.forEach(team => {
            const cellTeamMoney = document.createElement("td");
            cellTeamMoney.innerHTML = `$${team.MONEY}`;
            tableRowTeamMoney.appendChild(cellTeamMoney);
        });

        const divSavedGame = querySelectorAndCheck<HTMLDivElement>(document, "div#tab-content-load-game");

        querySelectorAndCheck(document, "button#saved-game-load").addEventListener("click", () => {
            this.loadGame(parsedJson);
            divSavedGame.style.display = "none";
        });
        querySelectorAndCheck(document, "button#saved-game-delete").addEventListener("click", function () {
            if (window.confirm("Delete the saved game?")) {
                window.localStorage.removeItem(Operator.LOCAL_STORAGE_KEY);
                divSavedGame.style.display = "none";
            }
        });
    }

    private saveGame(): void {
        if (!this.teamArray) {
            throw new Error("called saveGame() when teamArray is undefined");
        }
        const objectToSave: SavedGameInLocalStorage = {
            GAME_TIMER_REMAINING_MILLISEC: this.GAME_TIMER.getRemainingMillisec(),
            TEAMS: this.teamArray.map(t => t.getObjectToSaveInLocalStorage())
        };

        window.localStorage.setItem(Operator.LOCAL_STORAGE_KEY,
            JSON.stringify(objectToSave)
        );
        //TODO save the settings
    }

    private loadGame(parsedJson: SavedGameInLocalStorage): void {

        this.GAME_TIMER.setRemainingMillisec(parsedJson.GAME_TIMER_REMAINING_MILLISEC);

        this.teamCount = parsedJson.TEAMS.length;
        this.initTeams();
        for (let teamIdx = 0; teamIdx < this.teamCount; teamIdx++) {
            const team = parsedJson.TEAMS[teamIdx];
            this.teamArray![teamIdx].loadFromLocalStorage(team);
            this.buzzHistoryDiagram?.setTeamName(teamIdx, team.TEAM_NAME);
        }

        if (this.isGameTimerOver()) {
            this.stateMachine?.goToState("gameEnd");
        }
    }

    public handleGameEnd(): void {
        this.GAME_TIMER.pause();

        // First play the eight high-pitched beeps sound, then play the closing music
        this.AUDIO_MANAGER.playInOrder(
            this.AUDIO_MANAGER.ROUND_END,
            this.AUDIO_MANAGER.MUSIC_GAME_END
        );

        this.presentation?.hideHeaderAndFooter();

        this.showBackdropForPopups();
        this.DIV_GAME_END_CONTROLS.style.display = "block";
        this.DIV_STATISTICS_CHART_POPUP.style.display = "block";

        const teamRankingTableHtml = this.getTeamRankingTableHtml();
        this.DIV_TEAM_RANKING_WRAPPER.innerHTML = teamRankingTableHtml;
        this.presentation?.setGameEndTeamRankingHtml(teamRankingTableHtml);

        if (this.teamArray) {

            createPieCharts(this, this.DIV_PIE_CHARTS, this.teamArray);

            createLineChartOfMoneyOverTime(this.DIV_LINE_CHART, this.DIV_LINE_CHART_LEGEND, this.teamArray);

            if (this.presentation) {
                createPieCharts(this, this.presentation.getDivForPieCharts(), this.teamArray);
                createLineChartOfMoneyOverTime(this.presentation.getDivForLineChart(), this.presentation.getDivForLineChartLegend(), this.teamArray);
            }
        }
    }

    private getTeamRankingTableHtml(): string {
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
            <td>${team.getMoney().toLocaleString()}</td>
            </tr>
            `
        ));

        html.push("</tbody></table>");

        return html.join("");
    }

    public showBuzzHistory(): void {
        if (this.buzzHistoryForClue && this.buzzHistoryDiagram) {
            this.GAME_TIMER.pause();

            this.showBackdropForPopups();
            this.DIV_BUZZ_HISTORY_PROMPT.style.display = "block";

            this.buzzHistoryDiagram.showNewHistory(this.buzzHistoryForClue);
        }
    }

    private showBackdropForPopups(): void {
        this.DIV_BACKDROP_FOR_POPUPS.style.display = "block";
    }

    private hideBackdropForPopups(): void {
        this.DIV_BACKDROP_FOR_POPUPS.style.display = "none";
    }

    public hideBuzzHistory(): void {
        this.GAME_TIMER.resume();
        this.hideBackdropForPopups();
        this.DIV_BUZZ_HISTORY_PROMPT.style.display = "none";
    }

    public getStateMachine(): StateMachine | undefined {
        return this.stateMachine;
    }

    public getTeamArray(): Team[] | undefined {
        return this.teamArray;
    }

    public getQuestionCount(): number {
        return this.questionCount;
    }

    public setInstructions(text: string): void {
        this.DIV_INSTRUCTIONS.innerHTML = text;
    }

    public shouldShowBuzzHistory(): boolean {
        if (this.teamArray) {
            return this.teamArray.some(t => t.hasBuzzedForCurrentQuestion);
        } else {
            throw new Error("called shouldShowBuzzHistory() when teamArray is undefined");
        }
    }

    public startCategoryCarousel(): void {
        this.categoryCarouselIndex = 0;
        this.presentation?.hideHeaderAndFooter();
        this.presentation?.setCategoryCarouselIndex(this.categoryCarouselIndex);

        const categoryName = SCRAPED_GAME.ROUNDS[this.gameRoundIndex].CATEGORIES[this.categoryCarouselIndex].NAME;
        this.DIV_INSTRUCTIONS.innerText =
            `Category 1 of ${GameBoard.TABLE_COLUMN_COUNT}: "${categoryName}". Press space to show the next category in the carousel`;
    }

    public stopCategoryCarousel(): void {
        this.presentation?.showHeaderAndFooter();
    }

    public hasMoreCategoryCarousel(): boolean {
        return this.categoryCarouselIndex < GameBoard.TABLE_COLUMN_COUNT - 1;
    }

    public showNextCategoryCarousel(): void {
        this.categoryCarouselIndex++;
        this.presentation?.setCategoryCarouselIndex(this.categoryCarouselIndex);

        const categoryName = SCRAPED_GAME.ROUNDS[this.gameRoundIndex].CATEGORIES[this.categoryCarouselIndex].NAME;
        const str = `Category ${this.categoryCarouselIndex + 1} of ${GameBoard.TABLE_COLUMN_COUNT}: "${categoryName}".`;

        if (this.hasMoreCategoryCarousel()) {
            this.DIV_INSTRUCTIONS.innerText = `${str} Press space to show the next category in the carousel`;
        } else {
            this.DIV_INSTRUCTIONS.innerText = `${str} Press space to start the game`;
        }
    }

    public startNextGameRound(): void {
        this.gameRoundIndex++;
        const gameRound = SCRAPED_GAME.ROUNDS[this.gameRoundIndex];
        this.GAME_BOARD.setRound(gameRound);

        this.DIV_CLUE_WRAPPER.style.display = "none";

        this.DIV_INSTRUCTIONS.innerText = `Get ready for round ${this.gameRoundIndex + 1}, press space to start the category carousel`;
        this.presentation?.setRoundStartText(`Get ready for round ${this.gameRoundIndex + 1}`);
        this.presentation?.setCategoryCarouselRound(gameRound);
    }

    public hasMoreRounds(): boolean {
        return this.gameRoundIndex < SCRAPED_GAME.ROUNDS.length - 1;
    }

    public isAllCluesRevealedThisRound(): boolean {
        return this.GAME_BOARD.isAllCluesRevealedThisRound();
    }

}
