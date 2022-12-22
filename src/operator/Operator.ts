import { Clue } from "../Clue";
import { CountdownTimer } from "../CountdownTimer";
import { Presentation } from "../presentation/Presentation";
import { Settings } from "../Settings";
import { StateMachine } from "../stateMachine/StateMachine";
import { Team, TeamSavedInLocalStorage, TeamState } from "../Team";
import { AudioManager } from "./AudioManager";
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
    private readonly specialCategoryOverlay: HTMLDivElement;
    private gameTimer: CountdownTimer; //not readonly because it may be changed when we load a game from localStorage
    private teamArray: Team[];
    private presentClue: Clue;
    private presentation: Presentation;
    private isPaused = false;
    private stateMachine: StateMachine;
    private teamPresentlyAnswering: Team;
    private questionCount = 0;

    constructor(audioManager: AudioManager, settings: Settings) {
        this.audioManager = audioManager;
        this.settings = settings;

        this.divClueWrapper = document.querySelector("div#clue-wrapper");
        this.divClueQuestion = document.querySelector("div#div-clue-question");
        this.divClueValue = document.querySelector("div#div-clue-value");
        this.divClueCategory = document.querySelector("div#div-clue-category");
        this.divClueAnswer = document.querySelector("div#div-clue-answer");
        this.divClueAirdate = document.querySelector("div#div-clue-airdate");

        this.trQuestion = document.querySelector("tr#tr-clue-question");
        this.trAnswer = document.querySelector("tr#tr-clue-answer");

        this.divPaused = document.querySelector("div#paused");
        this.divInstructions = document.querySelector("div#instructions");

        this.buttonStartGame = document.querySelector("button#start-game");
        this.buttonSkipClue = document.querySelector("button#skip-clue");

        this.specialCategoryPrompt = document.querySelector("div#special-category-prompt");
        this.specialCategoryOverlay = document.querySelector("div#special-category-overlay");

        this.initPauseKeyboardListener();
        this.initMouseListeners();
        this.lookForSavedGame();

        this.initGameTimer(this.settings.gameTimeLimitMillisec);

        window.open("../presentation/presentation.html", "windowPresentation");

        /*
        The rest of the initialization happens in this.handlePresentationReady(),
        which gets called by the Presentation instance in the window we opened.
        */
    }

    private initGameTimer(millisec: number): void {
        this.gameTimer = new CountdownTimer(millisec);
        this.gameTimer.addProgressElement(document.querySelector("div#game-timer progress"));
        this.gameTimer.addTextDiv(document.querySelector("div#game-timer div#remaining-time-text"));
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

        window.addEventListener("keydown", keyboardEvent => {
            const keyboardKey = keyboardEvent.key;
            if (teamNumbers.has(keyboardKey)) {
                const teamIndex = Number(keyboardKey) - 1;
                const team = this.teamArray[teamIndex];
                team.showKeyDown();
            }
        });
        window.addEventListener("keyup", keyboardEvent => {
            const keyboardKey = keyboardEvent.key;
            if (teamNumbers.has(keyboardKey)) {
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
        this.teamPresentlyAnswering.handleAnswerCorrect(this.presentClue);
    }

    public handleAnswerWrongOrTimeout(): void {
        this.teamPresentlyAnswering.handleAnswerIncorrectOrAnswerTimeout(this.presentClue);
    }

    private initMouseListeners(): void {
        document.querySelector("button#go-to-jeopardy-logo").addEventListener("click", () => this.presentation.showSlide("slide-jeopardy-logo"));

        this.buttonStartGame.addEventListener("click", () => this.startGame());

        this.buttonSkipClue.addEventListener("click", () => this.skipClue());

        document.querySelector("a#aMoneyOverride").addEventListener("click", () =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney"));


        document.querySelector("a#aGenerateGraphviz").addEventListener("click", () =>
            window.open("../graphvizViewer/graphvizViewer.html", "windowGraphvizViewer", "popup")
        );

        const GameEndControls = document.querySelector("div#game-end-controls");
        GameEndControls.querySelector("button#show-team-ranking-table").addEventListener("click", () => this.presentation.showSlide("slide-gameEnd-team-ranking-table"));
        GameEndControls.querySelector("button#show-money-over-time-line-chart").addEventListener("click", () => this.presentation.showSlide("slide-gameEnd-line-chart"));
        GameEndControls.querySelector("button#show-buzz-results-pie-charts").addEventListener("click", () => this.presentation.showSlide("slide-gameEnd-pie-charts"));

    }

    private startGame(): void {
        this.stateMachine.manualTrigger("startGame");
        this.buttonStartGame.setAttribute("disabled", "disabled");
        this.gameTimer.start();
    }


    public skipClue(): void {
        this.setAllTeamsState(TeamState.BUZZERS_OFF, true); // the second argument is endLockout
        this.buttonSkipClue.setAttribute("disabled", "disabled");
        this.buttonSkipClue.blur();
        this.stateMachine.goToState("getClueFromJService");
    }

    private initTeams(teamCount: number): void {
        this.teamArray = new Array(teamCount);
        document.querySelector("footer").innerHTML = "";
        this.presentation.clearFooter();
        for (let i = 0; i < teamCount; i++) {
            this.teamArray[i] = new Team(i, this.presentation, this.settings, this.audioManager);
        }
    }


    public playSoundQuestionTimeout(): void {
        this.audioManager.play("questionTimeout");
    }

    public handleBuzzerPress(keyboardEvent: KeyboardEvent): void {
        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        const team = this.teamArray[teamIndex];

        this.teamPresentlyAnswering = team;

        this.audioManager.play("teamBuzz");

        team.startAnswer();

        this.divInstructions.innerHTML = "Did they answer correctly? y / n";
    }

    public shouldGameEnd(): boolean {
        return this.gameTimer.getIsFinished() ||
            this.teamArray.some(team => team.getMoney() >= this.settings.teamMoneyWhenGameShouldEnd);
    }

    public handleLockout(keyboardEvent: KeyboardEvent): void {
        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        const team = this.teamArray[teamIndex];
        team.canBeLockedOut() && team.startLockout();
    }


    private showClueToOperator(clue: Clue) {
        /*
        This function only shows the airdate, category, and dollar value to the operator.
        The state machine will show the clue question after a timeout.
        */
        this.divClueWrapper.style.display = ""; //show it by removing "display=none"
        this.divClueCategory.innerHTML = clue.category.title;
        this.divClueValue.innerHTML = "$" + clue.value;
        this.divClueAirdate.innerHTML = clue.airdateParsed.getFullYear().toString();
        this.trAnswer.style.display = "none";
        this.divInstructions.innerHTML = "Read aloud the category and dollar value.";
    };

    private setClue(clue: Clue): void {
        this.presentClue = clue;
        this.showClueToOperator(clue);
        this.presentation.setClue(clue);

        if (clue.category.isSpecialCategory) {
            this.showSpecialCategoryPrompt();
        }
    }

    public isCurrentClueSpecialCategory(): boolean {
        return this.presentClue.category.isSpecialCategory;
    }

    public getClueFromJService(): Promise<void> {

        this.stateMachine.resetTimerForState("showClueCategoryAndValue");

        const promiseExecutor = (
            resolveFunc: () => void,
            rejectFunc: (rejectReason: Error) => void
        ) => {
            this.buttonStartGame.blur();
            this.trQuestion.style.display = "none";
            this.divInstructions.innerHTML = "Loading clue...";

            this.setClue(
                new Clue(
                    '[{"id":25876,"answer":"the booster","question":"The first stage of a rocket","value":600,"airdate":"2016-04-20T19:00:00.000Z","created_at":"2022-07-27T22:54:33.633Z","updated_at":"2022-07-27T22:54:33.633Z","category_id":4710,"game_id":5255,"invalid_count":null,"category":{"id":4710,"title":"spacecraft\\" types","created_at":"2022-07-27T22:54:33.521Z","updated_at":"2022-07-27T22:54:33.521Z","clues_count":5}}]'
                )
            );
            resolveFunc();

        };
        return new Promise<void>(promiseExecutor);
    }

    public __getClueFromJService__(): Promise<void> {

        // Use a recursive helper function so we can do retries.
        const fetchClueHelper = (
            promiseResolveFunc: () => void,
            promiseRejectFunc: (rejectReason: Error) => void,
            tryNum: number,
            maxTries: number
        ) => {
            // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "http://jservice.io/api/random");
            xhr.addEventListener("load", () => {

                if (xhr.status !== 200) {
                    alert(`Error ${xhr.status}: ${xhr.statusText}`);
                }

                const clue = new Clue(xhr.response);

                if (clue.isValid() && !clue.hasMultimedia()) {

                    this.setClue(clue);

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
        ) => {
            this.buttonStartGame.blur();
            this.trQuestion.style.display = "none";
            this.divInstructions.innerHTML = "Loading clue...";
            fetchClueHelper.call(this, resolveFunc, rejectFunc, 1, 5);
        };
        return new Promise<void>(promiseExecutor);

    }

    public fitClueQuestionToScreenInOperatorWindow(): void {
        this.presentation.fitClueQuestionToScreen();
    }

    public showSpecialCategoryPrompt(): void {
        this.specialCategoryPrompt.style.display = "block";
    }

    public hideSpecialCategoryPrompt(): void {
        this.specialCategoryPrompt.style.display = "none";
        this.gameTimer.resume();
    }

    public showSpecialCategoryOverlay(): void {
        this.hideSpecialCategoryPrompt();
        this.gameTimer.pause();

        const specialCategory = this.presentClue.category.specialCategory;
        this.specialCategoryOverlay.querySelector("#special-category-description").innerHTML = specialCategory.description;
        if (specialCategory.example) {
            this.specialCategoryOverlay.querySelector("#special-category-example-category").innerHTML = specialCategory.example.category;
            this.specialCategoryOverlay.querySelector("#special-category-example-question").innerHTML = specialCategory.example.question;
            this.specialCategoryOverlay.querySelector("#special-category-example-answer").innerHTML = specialCategory.example.answer;
        }

        this.specialCategoryOverlay.style.display = "block";

    }

    public hideSpecialCategoryOverlay(): void {
        this.specialCategoryOverlay.style.display = "none";
        this.setPaused(false);
    }

    public handleShowClueQuestion(): void {
        /*
        This method mostly is about showing the clue question to the operator.
        The clue question is already being shown in the presentation because
        the state machine changes the slide.
        */
        this.setAllTeamsState(TeamState.READING_QUESTION);

        this.divInstructions.innerHTML = "Read the question out loud. Buzzers open when you press space.";

        this.divClueQuestion.innerHTML = this.presentClue.getQuestionHtmlWithSubjectInBold();
        this.trQuestion.style.display = ""; //show it by removing "display=none"
        this.trAnswer.style.display = "none";

        this.buttonSkipClue.removeAttribute("disabled");

        this.hideSpecialCategoryPrompt();
    }

    public handleDoneReadingClueQuestion(): void {
        this.audioManager.play("doneReadingClueQuestion");
        this.trAnswer.style.display = ""; //show it by removing "display=none"
        this.divClueAnswer.innerHTML = this.presentClue.answer;
        this.divInstructions.innerHTML = "Wait for people to answer.";
        this.setAllTeamsState(TeamState.CAN_ANSWER);
        this.buttonSkipClue.setAttribute("disabled", "disabled");

        this.stateMachine.resetTimerForState("waitForBuzzes");

        this.teamArray.forEach(team => team.hasBuzzedForCurrentQuestion = false);
    }

    public handleShowAnswer(): void {

        // only save the game if somebody has more than $0
        if (this.teamArray.some(team => team.getMoney() > 0)) {
            this.saveGame();
        }

        this.setAllTeamsState(TeamState.BUZZERS_OFF);
        this.divInstructions.innerHTML = "Let people read the answer.";

        this.teamArray.forEach(team => {
            team.updateMoneyAtEndOfRound();
            if (!team.hasBuzzedForCurrentQuestion) {
                team.statistics.questionsNotBuzzed++;
            }
        });

        this.questionCount++;

    }

    public setAllTeamsState(targetState: TeamState, endLockout = false): void {
        this.teamArray.forEach(team => team.setState(targetState, endLockout));
    }

    public canTeamBuzz(keyboardEvent: KeyboardEvent): boolean {
        const teamNumber = Number(keyboardEvent.key);
        const teamIndex = teamNumber - 1;
        if (teamIndex > Operator.teamCount - 1) {
            return false;
        } else {
            return this.teamArray[teamIndex].canBuzz();
        }
    }

    public haveAllTeamsAnswered(): boolean {
        return this.teamArray.every(team => team.getState() === TeamState.ALREADY_ANSWERED);
    }

    public togglePaused(): void {
        this.setPaused(!this.isPaused);
    }

    public setPaused(isPaused: boolean): void {
        this.isPaused = isPaused;
        this.divPaused.style.display = isPaused ? "" : "none";
        this.stateMachine.setPaused(isPaused);
        this.gameTimer.setPaused(isPaused);
        this.teamArray.forEach(team => team.setPaused(isPaused));
        this.presentation.setPaused(isPaused);
    }

    public getIsPaused(): boolean {
        return this.isPaused;
    }

    public getTeam(teamIdx: number): Team {
        return this.teamArray[teamIdx];
    }

    private lookForSavedGame(): void {
        const divSavedGame = document.querySelector<HTMLDivElement>("div#saved-game-prompt");

        const rawLocalStorageResult = window.localStorage.getItem(Operator.localStorageKey);
        if (rawLocalStorageResult === null) {
            // no saved game found
            divSavedGame.style.display = "none";
            return;
        }

        const parsedJson: SavedGameInLocalStorage = JSON.parse(rawLocalStorageResult);

        const tableDetails = document.querySelector("table#saved-game-details tbody");

        const tableRowTeamNumber = document.createElement("tr");
        tableDetails.appendChild(tableRowTeamNumber);
        for (let i = 0; i < parsedJson.teams.length; i++) {
            const cellTeamNumber = document.createElement("td");
            cellTeamNumber.innerHTML = `Team ${i + 1}`;
            tableRowTeamNumber.appendChild(cellTeamNumber);
        }

        const tableRowTeamMoney = document.createElement("tr");
        tableDetails.appendChild(tableRowTeamMoney);
        for (let i = 0; i < parsedJson.teams.length; i++) {
            const cellTeamMoney = document.createElement("td");
            cellTeamMoney.innerHTML = "$" + parsedJson.teams[i].money;
            tableRowTeamMoney.appendChild(cellTeamMoney);
        }

        document.querySelector("button#saved-game-load").addEventListener("click", () => {
            this.loadGame(parsedJson);
            divSavedGame.style.display = "none";
        });
        document.querySelector("button#saved-game-delete").addEventListener("click", function () {
            if (window.confirm("Delete the saved game?")) {
                window.localStorage.removeItem(Operator.localStorageKey);
                divSavedGame.style.display = "none";
            }
        });
        document.querySelector("button#saved-game-dismiss").addEventListener("click", () => divSavedGame.style.display = "none");
    }

    private saveGame(): void {
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
            this.teamArray[i].loadFromLocalStorage(parsedJson.teams[i]);
        }

        if (this.shouldGameEnd()) {
            this.stateMachine.goToState("gameEnd");
        }
    }

    public handleGameEnd(): void {
        this.gameTimer.pause();

        this.divInstructions.innerHTML = "Game over";

        // First play the eight high-pitched beeps sound, then play the closing music
        this.audioManager.play("roundEnd")
            .then(() => this.audioManager.play("musicGameEnd"));

        document.querySelector<HTMLDivElement>("div#game-end-controls").style.display = "block";

        this.createTeamRankingTable();
        this.presentation.hideHeaderAndFooter();
        createPieCharts(this, this.presentation.getDivForPieCharts(), this.teamArray);
        createLineChart(this.presentation.getDivForLineChart(), this.presentation.getDivForLineChartLegend(), this.teamArray);
    }

    private createTeamRankingTable() {
        // sort teams by money descending
        const shallowCopy = this.teamArray.slice();
        function comparator(team1: Team, team2: Team) {
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

        this.presentation.setTeamRankingHtml(html.join(""));
    }


    public getStateMachine(): StateMachine {
        return this.stateMachine;
    }

    public getTeamArray(): Team[] {
        return this.teamArray;
    }

    public getQuestionCount(): number {
        return this.questionCount;
    }

}
