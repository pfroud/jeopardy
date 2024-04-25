import { BuzzHistoryChart, BuzzHistoryRecord, BuzzResultStartAnswer } from "../BuzzHistoryChart";
import { JServiceClue } from "../Clue";
import { querySelectorAndCheck } from "../common";
import { CountdownTimer } from "../CountdownTimer";
import { Presentation } from "../presentation/Presentation";
import { Settings } from "../Settings";
import { StateMachine } from "../stateMachine/StateMachine";
import { Team, TeamSavedInLocalStorage, TeamState } from "../Team";
import { AudioManager } from "../AudioManager";
import { SpecialCategory } from "../specialCategories";
import { createLineChartOfMoneyOverTime, createPieCharts } from "../statisticsCharts";
import { GameBoard } from "./GameBoard";
import { SCRAPED_GAME, ScrapedClue } from "../games";

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
    private readonly DIV_CLUE_AIRDATE: HTMLDivElement;
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
    private readonly GAME_TIMER: CountdownTimer; //not readonly because it may be changed when we load a game from localStorage
    private readonly KEYBOARD_KEYS_FOR_TEAM_NUMBERS = new Set<string>();
    private teamArray?: Team[];
    private teamNameInputElements?: HTMLInputElement[];
    private presentClue?: JServiceClue;
    private presentation?: Presentation;
    private isPaused = false;
    private stateMachine?: StateMachine;
    private teamPresentlyAnswering?: Team | undefined;
    private buzzHistoryRecordForActiveAnswer?: BuzzHistoryRecord<BuzzResultStartAnswer> | undefined;
    private questionCount = 0;

    private buzzHistoryDiagram: BuzzHistoryChart | undefined;

    public constructor(audioManager: AudioManager, settings: Settings) {
        this.AUDIO_MANAGER = audioManager;
        this.SETTINGS = settings;

        this.DIV_CLUE_WRAPPER = querySelectorAndCheck(document, "div#clue-wrapper");
        this.DIV_CLUE_QUESTION = querySelectorAndCheck(document, "div#div-clue-question");
        this.DIV_CLUE_VALUE = querySelectorAndCheck(document, "div#div-clue-value");
        this.DIV_CLUE_CATEGORY = querySelectorAndCheck(document, "div#div-clue-category");
        this.DIV_CLUE_ANSWER = querySelectorAndCheck(document, "div#div-clue-answer");
        this.DIV_CLUE_AIRDATE = querySelectorAndCheck(document, "div#div-clue-airdate");

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

        this.initPauseKeyboardListener();
        this.initMouseListeners();
        this.lookForSavedGame();

        this.GAME_TIMER = new CountdownTimer(this.SETTINGS.gameTimeLimitMillisec);
        this.GAME_TIMER.addProgressElement(querySelectorAndCheck(document, "div#game-timer progress"));
        this.GAME_TIMER.addTextElement(querySelectorAndCheck(document, "div#game-timer div.remaining-time-text"));

        // window.open("../presentation/presentation.html", "windowPresentation");

        const gameBoard = new GameBoard(this, querySelectorAndCheck<HTMLTableElement>(document, "table#gameBoard"));
        gameBoard.setRound(SCRAPED_GAME.rounds[0]);

        /*
        The rest of the initialization happens in this.handlePresentationReady(),
        which gets called by the Presentation instance in the window we opened.
        */
    }

    public gameBoardClueClicked(clue: ScrapedClue): void {
        console.log(`clicked on row ${clue.rowIndex}, category ${clue.categoryIndex}`);
    }


    public handlePresentationReady(presentationInstanceFromOtherWindow: Presentation): void {
        /* 
        This method gets called from the Presentation instance in the other window.
        */
        window.focus();
        this.presentation = presentationInstanceFromOtherWindow;
        this.initTeams();

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
                        this.presentClue.BUZZ_HISTORY.RECORDS[teamIndex].push({
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

            this.presentClue.BUZZ_HISTORY.RECORDS[this.teamPresentlyAnswering.getTeamIndex()]
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
        this.stateMachine?.goToState("getClueFromJService");
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

    public shouldGameEnd(): boolean {
        if (!this.teamArray) {
            throw new Error("called shouldGameEnd() when teamArray is undefined");
        }
        return this.GAME_TIMER.getIsFinished() ||
            this.teamArray.some(team => team.getMoney() >= this.SETTINGS.teamMoneyWhenGameShouldEnd);
    }

    public handleLockout(keyboardEvent: KeyboardEvent): void {
        if (!this.teamArray) {
            throw new Error("called handleLockout() when teamArray is undefined");
        }
        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        const team = this.teamArray[teamIndex];
        team.canBeLockedOut() && team.startLockout();

        this.presentClue?.BUZZ_HISTORY.RECORDS[teamIndex].push({
            startTimestamp: Date.now(),
            RESULT: { TYPE: "too-early-start-lockout" }
        });

    }


    private showClueToOperator(clue: JServiceClue): void {
        /*
        This function only shows the airdate, category, and dollar value to the operator.
        The state machine will show the clue question after a timeout.
        */
        this.DIV_CLUE_WRAPPER.style.display = ""; //show it by removing "display=none"
        this.DIV_CLUE_CATEGORY.innerHTML = clue.CATEGORY.TITLE;
        this.DIV_CLUE_VALUE.innerHTML = `$${clue.VALUE}`;
        this.DIV_CLUE_AIRDATE.innerHTML = clue.AIRDATE.getFullYear().toString();
        this.TR_ANSWER.style.display = "none";
    }

    private setPresentClue(clue: JServiceClue): void {
        this.presentClue = clue;
        this.showClueToOperator(clue);
        this.presentation?.setClue(clue);

        if (clue.CATEGORY.specialCategory) {
            this.showSpecialCategoryPrompt(clue.CATEGORY.specialCategory);
        }
    }

    public isCurrentClueSpecialCategory(): boolean {
        return this.presentClue?.CATEGORY.specialCategory !== null;
    }

    public getClue(): void {

        this.stateMachine?.getCountdownTimerForState("showClueCategoryAndValue").reset();

        this.BUTTON_START_GAME.blur();
        this.TR_QUESTION.style.display = "none";

        this.setPresentClue(
            new JServiceClue(this,
                '[{"id":25876,"answer":"the booster","question":"The first stage of a rocket","value":600,"airdate":"2016-04-20T19:00:00.000Z","created_at":"2022-07-27T22:54:33.633Z","updated_at":"2022-07-27T22:54:33.633Z","category_id":4710,"game_id":5255,"invalid_count":null,"category":{"id":4710,"title":"spacecraft\\" types","created_at":"2022-07-27T22:54:33.521Z","updated_at":"2022-07-27T22:54:33.521Z","clues_count":5}}]'
            )
        );
    }

    /*
    public getClueFromJService(): Promise<void> {

        this.stateMachine?.getCountdownTimerForState("showClueCategoryAndValue").reset();

        // Use a recursive helper function so we can do retries.
        const fetchClueHelper = (
            promiseResolveFunc: () => void,
            promiseRejectFunc: (rejectReason: Error) => void,
            tryNum: number,
            maxTries: number
        ): void => {
            // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
            const xhr = new XMLHttpRequest();
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/From
            xhr.open("GET", "http://jservice.io/api/random");
            xhr.setRequestHeader("From", "pfroud@gmail.com");
            xhr.addEventListener("load", () => {

                if (xhr.status !== 200) {
                    alert(`Error ${xhr.status}: ${xhr.statusText}`);
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                const clue = new Clue(this, xhr.response);

                if (clue.isValid() && !clue.hasMultimedia()) {

                    this.setPresentClue(clue);

                    // we don't need to return the clue object to the state machine
                    promiseResolveFunc();
                } else {
                    if (tryNum < maxTries) {
                        fetchClueHelper.call(this, promiseResolveFunc, promiseRejectFunc, tryNum + 1, maxTries);
                    } else {
                        promiseRejectFunc(new Error(`couldn't fetch clue after ${maxTries} tries`));
                    }
                }
            });
            xhr.send();
        };


        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise#syntax
        const promiseExecutor = (
            resolveFunc: () => void,
            rejectFunc: (rejectReason: Error) => void
        ): void => {
            this.BUTTON_START_GAME.blur();
            this.TR_QUESTION.style.display = "none";
            fetchClueHelper.call(this, resolveFunc, rejectFunc, 1, 5);
        };
        return new Promise<void>(promiseExecutor);

    }
    */

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

        const specialCategory = this.presentClue?.CATEGORY.specialCategory;
        if (!specialCategory) {
            throw new Error("called showSpecialCategoryOverlay() when the present clue does not have a special category");
        }

        this.presentation?.showSpecialCategoryPopup(specialCategory);

        querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, ".popup-title").innerHTML = specialCategory.DISPLAY_NAME;
        querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-description").innerHTML = specialCategory.DESCRIPTION;
        if (specialCategory.EXAMPLE) {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.remove("no-example");
            querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-category").innerHTML = specialCategory.EXAMPLE.CATEGORY;
            querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-question").innerHTML = specialCategory.EXAMPLE.QUESTION;
            querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-answer").innerHTML = specialCategory.EXAMPLE.ANSWER;
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

        this.DIV_CLUE_QUESTION.innerHTML = this.presentClue.getQuestionHtmlWithSubjectInBold();
        this.TR_QUESTION.style.display = ""; //show it by removing "display=none"
        this.TR_ANSWER.style.display = "none";

        this.BUTTON_SKIP_CLUE.removeAttribute("disabled");

        this.hideSpecialCategoryPrompt();
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

        if (this.presentClue) {
            this.presentClue.BUZZ_HISTORY.timestampWhenClueQuestionFinishedReading = Date.now();
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

        const divSavedGame = querySelectorAndCheck<HTMLDivElement>(document, "div#tab-content-load-game");

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

        if (this.shouldGameEnd()) {
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
        querySelectorAndCheck<HTMLDivElement>(document, "div#game-end-controls").style.display = "block";
        querySelectorAndCheck<HTMLDivElement>(document, "div#statistics-chart-popup").style.display = "block";

        const teamRankingTableHtml = this.getTeamRankingTableHtml();
        querySelectorAndCheck(document, "div#team-ranking-wrapper").innerHTML = teamRankingTableHtml;
        this.presentation?.setTeamRankingHtml(teamRankingTableHtml);

        if (this.teamArray) {

            createPieCharts(this, querySelectorAndCheck(document, "div#pie-charts"), this.teamArray);

            createLineChartOfMoneyOverTime(
                querySelectorAndCheck(document, "div#line-chart"),
                querySelectorAndCheck(document, "div#line-chart-legend"),
                this.teamArray
            );

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

        shallowCopy.forEach(team => {
            html.push(
                "<tr>" +
                "<td>" + team.getTeamName() + "</td>" +
                "<td>$" + team.getMoney().toLocaleString() + "</td>" +
                "</tr>"
            );
        });

        html.push("</tbody></table>");

        return html.join("");
    }

    public showBuzzHistory(): void {
        if (this.presentClue && this.buzzHistoryDiagram) {
            this.GAME_TIMER.pause();

            this.showBackdropForPopups();
            this.DIV_BUZZ_HISTORY_PROMPT.style.display = "block";

            this.buzzHistoryDiagram.showNewHistory(this.presentClue.BUZZ_HISTORY);
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

}
