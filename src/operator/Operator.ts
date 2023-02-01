import { BuzzHistoryDiagram, BuzzHistoryForClue, BuzzHistoryRecord, BuzzResult } from "../buzz-history/buzzHistoryForClue";
import { Clue } from "../Clue";
import { querySelectorAndCheck } from "../common";
import { CountdownTimer } from "../CountdownTimer";
import { Presentation } from "../presentation/Presentation";
import { Settings } from "../Settings";
import { StateMachine } from "../stateMachine/StateMachine";
import { Team, TeamSavedInLocalStorage, TeamState } from "../Team";
import { AudioManager } from "./AudioManager";
import { SpecialCategory } from "./specialCategories";
import { createLineChart, createPieCharts } from "./statisticsCharts";

interface SavedGameInLocalStorage {
    gameTimerRemainingMillisec: number,
    teams: TeamSavedInLocalStorage[]
    // todo save the settings
}

export class Operator {
    public static teamCount = 5; //not readonly because it can change if we load a game from localStorage
    private static readonly localStorageKey = "jeopardy";

    private readonly audioManager: AudioManager;
    private readonly settings: Settings;
    private readonly divClueWrapper: HTMLDivElement;
    private readonly divClueQuestion: HTMLDivElement;
    private readonly divClueValue: HTMLDivElement;
    private readonly divClueCategory: HTMLDivElement;
    private readonly divClueAnswer: HTMLDivElement;
    private readonly divClueAirdate: HTMLDivElement;
    private readonly trQuestion: HTMLTableRowElement;
    private readonly trAnswer: HTMLTableRowElement;
    private readonly divPaused: HTMLDivElement;
    private readonly divInstructions: HTMLDivElement;
    private readonly buttonStartGame: HTMLButtonElement;
    private readonly buttonSkipClue: HTMLButtonElement;
    private readonly specialCategoryPrompt: HTMLDivElement;
    private readonly specialCategoryTitle: HTMLSpanElement;
    private readonly specialCategoryPopup: HTMLDivElement;
    private readonly gameTimer: CountdownTimer; //not readonly because it may be changed when we load a game from localStorage
    private teamArray?: Team[];
    private presentClue?: Clue;
    private presentation?: Presentation;
    private isPaused = false;
    private stateMachine?: StateMachine;
    private teamPresentlyAnswering?: Team;
    private questionCount = 0;

    private buzzHistoryForPresentClue?: BuzzHistoryForClue;
    private readonly buzzHistoryDiagram: BuzzHistoryDiagram;

    public constructor(audioManager: AudioManager, settings: Settings) {
        this.audioManager = audioManager;
        this.settings = settings;

        this.divClueWrapper = querySelectorAndCheck(document, "div#clue-wrapper");
        this.divClueQuestion = querySelectorAndCheck(document, "div#div-clue-question");
        this.divClueValue = querySelectorAndCheck(document, "div#div-clue-value");
        this.divClueCategory = querySelectorAndCheck(document, "div#div-clue-category");
        this.divClueAnswer = querySelectorAndCheck(document, "div#div-clue-answer");
        this.divClueAirdate = querySelectorAndCheck(document, "div#div-clue-airdate");

        this.trQuestion = querySelectorAndCheck(document, "tr#tr-clue-question");
        this.trAnswer = querySelectorAndCheck(document, "tr#tr-clue-answer");

        this.divPaused = querySelectorAndCheck(document, "div#paused");
        this.divInstructions = querySelectorAndCheck(document, "div#instructions");

        this.buttonStartGame = querySelectorAndCheck(document, "button#start-game");
        this.buttonSkipClue = querySelectorAndCheck(document, "button#skip-clue");

        this.specialCategoryPrompt = querySelectorAndCheck(document, "div#special-category-prompt");
        this.specialCategoryTitle = querySelectorAndCheck(this.specialCategoryPrompt, "span#special-category-title");

        this.specialCategoryPopup = querySelectorAndCheck(document, "div#special-category-popup");

        this.initPauseKeyboardListener();
        this.initMouseListeners();
        this.lookForSavedGame();

        this.gameTimer = new CountdownTimer(this.settings.gameTimeLimitMillisec);
        this.gameTimer.addProgressElement(querySelectorAndCheck(document, "div#game-timer progress"));
        this.gameTimer.addTextElement(querySelectorAndCheck(document, "div#game-timer div.remaining-time-text"));

        this.buzzHistoryDiagram = new BuzzHistoryDiagram(Operator.teamCount, querySelectorAndCheck(document, "svg#buzz-history"));

        window.open("../presentation/presentation.html", "windowPresentation");

        /*
        The rest of the initialization happens in this.handlePresentationReady(),
        which gets called by the Presentation instance in the window we opened.
        */
    }


    public handlePresentationReady(presentationInstanceFromOtherWindow: Presentation): void {
        /* 
        This method gets called from the Presentation instance in the other window.
        */
        window.focus();
        this.presentation = presentationInstanceFromOtherWindow;
        this.initTeams(Operator.teamCount);

        this.initBuzzerFootswitchIconDisplay();

        this.gameTimer.addProgressElement(this.presentation.getProgressElementForGameTimer());

        this.stateMachine = new StateMachine(this.settings, this, this.presentation);

        this.buttonStartGame.removeAttribute("disabled");
        this.buttonStartGame.focus();
        this.divInstructions.innerHTML = "Ready. Click the button to start the game.";

    }

    private initBuzzerFootswitchIconDisplay(): void {
        /*
        Show a small picture of the footswitch used for the buzzers
        so people can verify their buzzers are working.
        */
        const teamNumbers = new Set<string>();
        for (let i = 0; i < Operator.teamCount; i++) {
            teamNumbers.add(String(i + 1));
        }

        // TODO checking the team state is a bad way to find out what the buzz result is
        function getBuzzResult(team: Team): BuzzResult {
            switch (team.getState()) {
                case "can-answer":
                    return {
                        type: "start-answering",
                        answeredCorrectly: true,
                        endTimestamp: Date.now() + 1000 //TODO figure out a way to access the time when they finish answering
                    };
                case "reading-question":
                    return {
                        type: "too-early",
                    };
                default:
                    return {
                        type: "ignore",
                        reason: team.getState()
                    };
            }
        }

        // TODO avoid adding another keyboard listener
        window.addEventListener("keydown", keyboardEvent => {
            const keyboardKey = keyboardEvent.key;
            if (this.teamArray && teamNumbers.has(keyboardKey)) {
                const teamIndex = Number(keyboardKey) - 1;
                const teamObj = this.teamArray[teamIndex];
                teamObj.showKeyDown();

                this.buzzHistoryForPresentClue?.records[teamIndex].push({
                    timestamp: Date.now(),
                    source: "Operator.initBuzzerFootswitchIconDisplay() keydown",
                    result: getBuzzResult(teamObj)
                });

            }
        });

        window.addEventListener("keyup", keyboardEvent => {
            const keyboardKey = keyboardEvent.key;
            if (this.teamArray && teamNumbers.has(keyboardKey)) {
                const teamIndex = Number(keyboardKey) - 1;
                const team = this.teamArray[teamIndex];
                team.showKeyUp();
            }
        });

    }

    private initPauseKeyboardListener(): void {
        window.addEventListener("keydown", keyboardEvent => {
            if (keyboardEvent.key === "p") {
                this.togglePaused();
            }
        });
    }

    public handleAnswerCorrect(): void {
        if (this.presentClue) {
            this.teamPresentlyAnswering?.handleAnswerCorrect(this.presentClue);
        } else {
            console.error("called handleAnswerCorrect() when presentClue is undefined");
        }
    }

    public handleAnswerWrongOrTimeout(): void {
        if (this.presentClue) {
            this.teamPresentlyAnswering?.handleAnswerIncorrectOrAnswerTimeout(this.presentClue);
        } else {
            console.error("called handleAnswerWrongOrTimeout() when presentClue is undefined");
        }
        this.stateMachine?.getCountdownTimerForState("waitForTeamAnswer").showProgressBarFinished();
    }

    private initMouseListeners(): void {


        this.buttonStartGame.addEventListener("click", () => this.startGame());

        this.buttonSkipClue.addEventListener("click", () => this.skipClue());

        querySelectorAndCheck(document, "a#aMoneyOverride").addEventListener("click", () => console.log("asdf"));

        querySelectorAndCheck(document, "a#aMoneyOverride").addEventListener("click", () =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney"));


        querySelectorAndCheck(document, "a#aOpenStateMachineViewer").addEventListener("click", () =>
            window.open("../stateMachineViewer", "windowStateMachineViewer", "popup")
        );

        const gameEndControls = querySelectorAndCheck(document, "div#game-end-controls");
        querySelectorAndCheck(gameEndControls, "button#show-team-ranking-table").addEventListener("click", () => this.presentation?.showSlide("slide-gameEnd-team-ranking-table"));
        querySelectorAndCheck(gameEndControls, "button#show-money-over-time-line-chart").addEventListener("click", () => this.presentation?.showSlide("slide-gameEnd-line-chart"));
        querySelectorAndCheck(gameEndControls, "button#show-buzz-results-pie-charts").addEventListener("click", () => this.presentation?.showSlide("slide-gameEnd-pie-charts"));

    }

    private startGame(): void {
        this.stateMachine?.manualTrigger("startGame");
        this.buttonStartGame.setAttribute("disabled", "disabled");
        this.gameTimer.start();
    }


    public skipClue(): void {
        this.setAllTeamsState("buzzers-off", true); // the second argument is endLockout
        this.buttonSkipClue.setAttribute("disabled", "disabled");
        this.buttonSkipClue.blur();
        this.stateMachine?.goToState("getClueFromJService");
    }

    private initTeams(teamCount: number): void {
        if (!this.presentation) {
            console.error("called initTeams() when presentation is undefined");
            return;
        }

        this.teamArray = new Array<Team>(teamCount);
        querySelectorAndCheck(document, "footer").innerHTML = "";
        this.presentation.clearFooter();
        for (let i = 0; i < teamCount; i++) {
            this.teamArray[i] = new Team(i, this, this.presentation, this.settings, this.audioManager);
        }
    }


    public playSoundQuestionTimeout(): void {
        this.audioManager.play("questionTimeout");
    }

    public handleBuzzerPress(keyboardEvent?: KeyboardEvent): void {
        if (!this.teamArray) {
            console.error("called handleBuzzerPress() when teamArray is undefined");
            return;
        }
        if (!keyboardEvent) {
            console.error("called handleBuzzerPress() without a keyboardEvent");
            return;
        }
        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        const team = this.teamArray[teamIndex];

        this.teamPresentlyAnswering = team;

        this.audioManager.play("teamBuzz");

        team.startAnswer();

        this.divInstructions.innerHTML = "Did they answer correctly? y / n";

    }

    public shouldGameEnd(): boolean {
        if (this.teamArray) {
            return this.gameTimer.getIsFinished() ||
                this.teamArray.some(team => team.getMoney() >= this.settings.teamMoneyWhenGameShouldEnd);
        } else {
            console.error("called shouldGameEnd() when teamArray is undefined");
            return false;
        }
    }

    public handleLockout(keyboardEvent: KeyboardEvent): void {
        if (this.teamArray) {
            const teamNumber = Number(keyboardEvent.key);
            const teamIndex = teamNumber - 1;
            const team = this.teamArray[teamIndex];
            team.canBeLockedOut() && team.startLockout();
        } else {
            console.error("called handleLockout() when teamArray is undefined");
        }
    }


    private showClueToOperator(clue: Clue): void {
        /*
        This function only shows the airdate, category, and dollar value to the operator.
        The state machine will show the clue question after a timeout.
        */
        this.divClueWrapper.style.display = ""; //show it by removing "display=none"
        this.divClueCategory.innerHTML = clue.category.title;
        this.divClueValue.innerHTML = `$${clue.value}`;
        this.divClueAirdate.innerHTML = clue.airdate.getFullYear().toString();
        this.trAnswer.style.display = "none";
        this.divInstructions.innerHTML = "Read aloud the category and dollar value.";
    }

    private setPresentClue(clue: Clue): void {
        this.presentClue = clue;
        this.showClueToOperator(clue);
        this.presentation?.setClue(clue);

        if (clue.category.specialCategory) {
            this.showSpecialCategoryPrompt(clue.category.specialCategory);
        }
    }

    public isCurrentClueSpecialCategory(): boolean {
        return this.presentClue?.category.specialCategory !== null;
    }

    public getClueForTesting(): Promise<void> {

        this.stateMachine?.getCountdownTimerForState("showClueCategoryAndValue").reset();

        const promiseExecutor = (
            resolveFunc: () => void,
        ): void => {
            this.buttonStartGame.blur();
            this.trQuestion.style.display = "none";
            this.divInstructions.innerHTML = "Loading clue...";

            this.setPresentClue(
                new Clue(
                    '[{"id":25876,"answer":"the booster","question":"The first stage of a rocket","value":600,"airdate":"2016-04-20T19:00:00.000Z","created_at":"2022-07-27T22:54:33.633Z","updated_at":"2022-07-27T22:54:33.633Z","category_id":4710,"game_id":5255,"invalid_count":null,"category":{"id":4710,"title":"spacecraft\\" types","created_at":"2022-07-27T22:54:33.521Z","updated_at":"2022-07-27T22:54:33.521Z","clues_count":5}}]'
                )
            );
            resolveFunc();

        };
        return new Promise<void>(promiseExecutor);
    }

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
            xhr.open("GET", "http://jservice.io/api/random");
            xhr.addEventListener("load", () => {

                if (xhr.status !== 200) {
                    alert(`Error ${xhr.status}: ${xhr.statusText}`);
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                const clue = new Clue(xhr.response);

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


        /*
        The promise only tells the state machine when to go to the next state.
        The promise does NOT pass the clue object to the state machine.
        The clue object is only stored by the operator.
        */
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise#syntax
        const promiseExecutor = (
            resolveFunc: () => void,
            rejectFunc: (rejectReason: Error) => void
        ): void => {
            this.buttonStartGame.blur();
            this.trQuestion.style.display = "none";
            this.divInstructions.innerHTML = "Loading clue...";
            fetchClueHelper.call(this, resolveFunc, rejectFunc, 1, 5);
        };
        return new Promise<void>(promiseExecutor);

    }

    public fitClueQuestionToScreenInOperatorWindow(): void {
        this.presentation?.fitClueQuestionToScreen();
    }

    public showSpecialCategoryPrompt(specialCategory: SpecialCategory): void {
        this.specialCategoryTitle.innerHTML = specialCategory.displayName;
        this.specialCategoryPrompt.style.display = "block";
    }

    public hideSpecialCategoryPrompt(): void {
        this.specialCategoryPrompt.style.display = "none";
        this.gameTimer.resume();
    }

    public showSpecialCategoryOverlay(): void {
        this.gameTimer.pause();

        const specialCategory = this.presentClue?.category.specialCategory;
        if (!specialCategory) {
            console.error("called showSpecialCategoryOverlay() when the present clue does not have a special category");
            return;
        }

        this.presentation?.showSpecialCategoryPopup(specialCategory);

        querySelectorAndCheck(this.specialCategoryPopup, "#special-category-title").innerHTML = specialCategory.displayName;
        querySelectorAndCheck(this.specialCategoryPopup, "#special-category-description").innerHTML = specialCategory.description;
        if (specialCategory.example) {
            querySelectorAndCheck(this.specialCategoryPopup, "#special-category-example-category").innerHTML = specialCategory.example.category;
            querySelectorAndCheck(this.specialCategoryPopup, "#special-category-example-question").innerHTML = specialCategory.example.question;
            querySelectorAndCheck(this.specialCategoryPopup, "#special-category-example-answer").innerHTML = specialCategory.example.answer;
        }

        this.specialCategoryPopup.style.display = "block";

    }

    public hideSpecialCategoryOverlay(): void {
        this.specialCategoryPopup.style.display = "none";
        this.presentation?.hideSpecialCategoryPopup();
        this.setPaused(false);
    }

    public handleShowClueQuestion(): void {
        if (!this.presentClue) {
            console.error("called handleShowClueQuestion() when presentClue is undefined");
            return;
        }

        /*
        This method mostly is about showing the clue question to the operator.
        The clue question is already being shown in the presentation because
        the state machine changes the slide.
        */
        this.setAllTeamsState("reading-question");

        this.divInstructions.innerHTML = "Read the question out loud. Buzzers open when you press space.";

        this.divClueQuestion.innerHTML = this.presentClue.getQuestionHtmlWithSubjectInBold();
        this.trQuestion.style.display = ""; //show it by removing "display=none"
        this.trAnswer.style.display = "none";

        this.buttonSkipClue.removeAttribute("disabled");

        // Reset the buzz history because this is a new clue
        this.buzzHistoryForPresentClue = {
            lockoutDurationMillisec: this.settings.durationLockoutMillisec,
            records: getEmpty2DArray(),
            timestampWhenClueQuestionFinishedReading: -1
        };

        function getEmpty2DArray(): BuzzHistoryRecord[][] {
            const rv = new Array<BuzzHistoryRecord[]>(Operator.teamCount);
            for (let i = 0; i < Operator.teamCount; i++) {
                rv[i] = [];
            }
            return rv;
        }

        this.hideSpecialCategoryPrompt();
    }

    public handleDoneReadingClueQuestion(): void {
        this.audioManager.play("doneReadingClueQuestion");
        this.trAnswer.style.display = ""; //show it by removing "display=none"
        if (this.presentClue) {
            this.divClueAnswer.innerHTML = this.presentClue.answer;
        } else {
            console.error("called handleDoneReadingClueQuestion() when presentClue is undefined");
        }
        this.divInstructions.innerHTML = "Wait for people to answer.";
        this.setAllTeamsState("can-answer");
        this.buttonSkipClue.setAttribute("disabled", "disabled");

        this.stateMachine?.getCountdownTimerForState("waitForBuzzes").reset();

        this.teamArray?.forEach(team => team.hasBuzzedForCurrentQuestion = false);
        if (this.buzzHistoryForPresentClue) {
            this.buzzHistoryForPresentClue.timestampWhenClueQuestionFinishedReading = Date.now();
        }
    }

    public handleShowAnswer(): void {

        // only save the game if somebody has more than $0
        if (this.teamArray?.some(team => team.getMoney() > 0)) {
            this.saveGame();
        }

        this.stateMachine?.getCountdownTimerForState("waitForBuzzes").showProgressBarFinished();
        this.stateMachine?.getCountdownTimerForState("waitForTeamAnswer").showProgressBarFinished();

        this.setAllTeamsState("buzzers-off");
        this.divInstructions.innerHTML = "Let people read the answer.";

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
            console.error("called canTeamBuzz() when teamArray is null");
            return false;
        }
        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        if (teamIndex > Operator.teamCount - 1) {
            return false;
        } else {
            return this.teamArray[teamIndex].canBuzz();
        }
    }

    public haveAllTeamsAnswered(): boolean {
        if (!this.teamArray) {
            return false;
        }
        if (this.settings.allowMultipleAnswersToSameQuestion) {
            // allow teams to keep answering until time runs out
            return false;
        } else {
            // each team only gets one try to answer a question
            return this.teamArray.every(team => team.getState() === "already-answered");
        }
    }

    public togglePaused(): void {
        this.setPaused(!this.isPaused);
    }

    public setPaused(isPaused: boolean): void {
        this.isPaused = isPaused;
        this.divPaused.style.display = isPaused ? "" : "none";
        this.stateMachine?.setPaused(isPaused);
        this.gameTimer.setPaused(isPaused);
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

        const rawLocalStorageResult = window.localStorage.getItem(Operator.localStorageKey);
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
        for (let i = 0; i < parsedJson.teams.length; i++) {
            const cellTeamNumber = document.createElement("td");
            cellTeamNumber.innerHTML = `Team ${i + 1}`;
            tableRowTeamNumber.appendChild(cellTeamNumber);
        }

        const tableRowTeamMoney = document.createElement("tr");
        tableDetails.appendChild(tableRowTeamMoney);
        for (const team of parsedJson.teams) {
            const cellTeamMoney = document.createElement("td");
            cellTeamMoney.innerHTML = `$${team.money}`;
            tableRowTeamMoney.appendChild(cellTeamMoney);
        }

        querySelectorAndCheck(document, "button#saved-game-load").addEventListener("click", () => {
            this.loadGame(parsedJson);
            divSavedGame.style.display = "none";
        });
        querySelectorAndCheck(document, "button#saved-game-delete").addEventListener("click", function () {
            if (window.confirm("Delete the saved game?")) {
                window.localStorage.removeItem(Operator.localStorageKey);
                divSavedGame.style.display = "none";
            }
        });
    }

    private saveGame(): void {
        if (!this.teamArray) {
            console.error("called saveGame() when teamArray is undefined");
            return;
        }
        const objectToSave: SavedGameInLocalStorage = {
            gameTimerRemainingMillisec: this.gameTimer.getRemainingMillisec(),
            teams: this.teamArray.map(t => t.getObjectToSaveInLocalStorage())
        };

        window.localStorage.setItem(Operator.localStorageKey,
            JSON.stringify(objectToSave)
        );
        //TODO save the settings
    }

    private loadGame(parsedJson: SavedGameInLocalStorage): void {

        this.gameTimer.setRemainingMillisec(parsedJson.gameTimerRemainingMillisec);

        this.initTeams(parsedJson.teams.length);
        for (let i = 0; i < parsedJson.teams.length; i++) {
            this.teamArray![i].loadFromLocalStorage(parsedJson.teams[i]);
        }

        if (this.shouldGameEnd()) {
            this.stateMachine?.goToState("gameEnd");
        }
    }

    public handleGameEnd(): void {
        this.gameTimer.pause();

        this.divInstructions.innerHTML = "Game over";

        // First play the eight high-pitched beeps sound, then play the closing music
        this.audioManager.play("roundEnd")?.then(() => this.audioManager.play("musicGameEnd"));

        querySelectorAndCheck<HTMLDivElement>(document, "div#game-end-controls").style.display = "block";

        this.createTeamRankingTable();
        this.presentation?.hideHeaderAndFooter();
        if (this.presentation && this.teamArray) {
            createPieCharts(this, this.presentation.getDivForPieCharts(), this.teamArray);
            createLineChart(this.presentation.getDivForLineChart(), this.presentation.getDivForLineChartLegend(), this.teamArray);
        }
    }

    private createTeamRankingTable(): void {
        if (!this.teamArray) {
            console.error("called createTeamRankingTable() when teamArray is undefined");
            return;
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
                "<td>" + team.teamName + "</td>" +
                "<td>$" + team.getMoney().toLocaleString() + "</td>" +
                "</tr>"
            );
        });

        html.push("</tbody></table>");

        this.presentation?.setTeamRankingHtml(html.join(""));
    }

    public showBuzzHistory(): void {
        if (this.buzzHistoryForPresentClue) {
            this.divInstructions.innerHTML = "The buzz history is showing. Press space to continue.";
            this.buzzHistoryDiagram.setHistory(this.buzzHistoryForPresentClue);
            this.buzzHistoryDiagram.redraw();
        }
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

}
