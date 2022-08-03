import { Team, TeamState } from "../Team.js";
import { StateMachine } from "../stateMachine/StateMachine.js";
import { AudioManager } from "./AudioManager.js";
import { Settings } from "../Settings.js";
import { Presentation } from "../presentation/Presentation.js";
import { CountdownTimer } from "../CountdownTimer.js";
import { CountdownOperation, CountdownTimerSource } from "../stateMachine/stateInterfaces.js";
import * as Chartist from "chartist";

export interface Clue {
    answer: string;
    question: string;
    value: number;
    airdate: string;
    category: { title: string }
}

interface SavedGameInLocalStorage {
    gameTimerRemainingMillisec: number,
    teamDollars: number[]
    // todo save the settings
}

export class Operator {
    public static teamCount = 4; //not readonly because it can change if we load a game from localStorage
    static readonly localStorageKey = "jeopardy-teams";

    private readonly audioManager: AudioManager;
    private readonly settings: Settings;
    private readonly divClueWrapper: HTMLDivElement;
    private readonly divClueQuestion: HTMLDivElement;
    private readonly divClueDollars: HTMLDivElement;
    private readonly divClueCategory: HTMLDivElement;
    private readonly divClueAnswer: HTMLDivElement;
    private readonly divClueAirdate: HTMLDivElement;
    private readonly trQuestion: HTMLTableRowElement;
    private readonly trAnswer: HTMLTableRowElement;
    private readonly divPaused: HTMLDivElement;
    private readonly divInstructions: HTMLDivElement;
    private readonly buttonStartGame: HTMLButtonElement;
    private readonly buttonSkipClue: HTMLButtonElement;
    private gameTimer: CountdownTimer; //not readonly because it may be changed when we load a game from localStorage
    private teamArray: Team[];
    private currentClueObj: Clue;
    private presentation: Presentation;
    private isPaused = false;
    private stateMachine: StateMachine;
    private teamPresentlyAnswering: Team;

    private countdownTimerForWaitForBuzzesState: CountdownTimer;
    private resetDurationForWaitForBuzzState = true;

    constructor(audioManager: AudioManager, settings: Settings) {
        this.audioManager = audioManager;
        this.settings = settings;

        this.divClueWrapper = document.querySelector("div#clue");
        this.divClueQuestion = document.querySelector("div#clue-question");
        this.divClueDollars = document.querySelector("div#clue-dollars");
        this.divClueCategory = document.querySelector("div#clue-category");
        this.divClueAnswer = document.querySelector("div#clue-answer");
        this.divClueAirdate = document.querySelector("div#clue-airdate");
        this.trQuestion = document.querySelector("tr#question");
        this.trAnswer = document.querySelector("tr#answer");
        this.divPaused = document.querySelector("div#paused");
        this.divInstructions = document.querySelector("div#instructions");
        this.buttonStartGame = document.querySelector("button#start-game");
        this.buttonSkipClue = document.querySelector("button#skip-clue");

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

    private initGameTimer(millisec: number) {
        this.gameTimer = new CountdownTimer(millisec);
        this.gameTimer.addProgressElement(document.querySelector("div#game-timer progress"));
        this.gameTimer.addTextDiv(document.querySelector("div#game-timer div#remaining-time-text"));
    }

    public handlePresentationReady(presentationInstanceFromOtherWindow: Presentation): void {
        /* 
        This method gets called from Presentation instance in the other window.
        */
        window.focus();
        this.presentation = presentationInstanceFromOtherWindow;
        this.initTeams(Operator.teamCount);

        this.initBuzzerFootswitchIconDisplay();

        this.gameTimer.addProgressElement(this.presentation.getProgressElementForGameTimer());

        this.stateMachine = new StateMachine(this.settings, this, this.presentation, this.audioManager);

        this.buttonStartGame.removeAttribute("disabled");
        this.divInstructions.innerHTML = "Ready. Click the button to start the game.";
    }

    private initBuzzerFootswitchIconDisplay(): void {
        /*
        Show a small picture of the footswitch used for the buzzers
        so people can verify their buzzers are working.
        */
        const teamNumbers: string[] =
            new Array(Operator.teamCount).fill(1).map(
                (elem, index) => String(index + 1)
            );

        window.addEventListener("keydown", keyboardEvent => {
            const keyboardKey = keyboardEvent.key;
            if (teamNumbers.includes(keyboardKey)) {
                const teamIndex = Number(keyboardKey) - 1;
                const teamObj = this.teamArray[teamIndex];
                teamObj.showKeyDown();
            }
        });
        window.addEventListener("keyup", keyboardEvent => {
            const keyboardKey = keyboardEvent.key;
            if (teamNumbers.includes(keyboardKey)) {
                const teamIndex = Number(keyboardKey) - 1;
                const teamObj = this.teamArray[teamIndex];
                teamObj.showKeyUp();
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
        this.teamPresentlyAnswering.handleAnswerCorrect(this.currentClueObj);
    }

    public handleAnswerWrongOrTimeout(): void {
        this.teamPresentlyAnswering.handleAnswerIncorrectOrAnswerTimeout(this.currentClueObj);
    }

    private initMouseListeners(): void {
        document.querySelector("button#go-to-jeopardy-logo").addEventListener("click", () => this.presentation.showSlide("slide-jeopardy-logo"));

        this.buttonStartGame.addEventListener("click", () => this.startGame());

        this.buttonSkipClue.addEventListener("click", () => this.skipClue());

        document.querySelector("a#aMoneyOverride").addEventListener("click", () =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney", "popup"));

        document.querySelector("a#aGenerateGraphviz").addEventListener("click", () =>
            this.stateMachine.showDotFileForGraphviz());
    }

    private startGame() {
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
        if (!this.presentation) {
            console.warn("can't init teams because no Presentation instance!");
            return;
        }

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
        const teamIndex = Number(keyboardEvent.key) - 1;
        const teamObj = this.teamArray[teamIndex];

        this.teamPresentlyAnswering = teamObj;

        this.audioManager.play("teamBuzz");

        teamObj.startAnswer();

        this.divInstructions.innerHTML = "Did they answer correctly? y / n";

        this.saveCountdownTimerForWaitForBuzzesState();
    }

    public shouldGameEnd(): boolean {
        if (this.gameTimer.getIsFinished()) {
            return true;
        } else {
            return this.teamArray.some(teamObj => teamObj.getDollars() >= this.settings.teamDollarsWhenGameShouldEnd);
        }
    }

    public handleLockout(keyboardEvent: KeyboardEvent): void {
        const teamIndex = Number(keyboardEvent.key) - 1;
        const teamObj = this.teamArray[teamIndex];
        teamObj.canBeLockedOut() && teamObj.startLockout();
    }

    public getClueFromJService(): Promise<void> {
        // only save the game if somebody has more than $0
        if (this.teamArray.some(teamObj => teamObj.getDollars() > 0)) {
            this.saveGame();
        }

        this.resetDurationForWaitForBuzzesState();

        function isClueValid(clueObj: Clue): boolean {
            return clueObj.value !== null &&
                clueObj.value > 0 &&
                clueObj.question != null &&
                clueObj.question.length > 0 &&
                clueObj.question !== "=" &&
                clueObj.answer.length > 0 &&
                clueObj.category !== null &&
                clueObj.category.title.length > 0 &&
                clueObj.category.title !== "=";
        }

        function doesQuestionHaveMultimedia(clueObj: Clue): boolean {
            /*
            Some Jeopardy clues have audio or video, which are shown or played on the 
            TV show. The J Archive does not have the audio or video, so we need to
            skip those clues.
            */
            const questionStr = clueObj.question.toLowerCase();
            const terms = ["seen here", "heard here"];
            for (let i = 0; i < terms.length; i++) {
                if (questionStr.includes(terms[i])) {
                    return true;
                }
            }
            return false;
        }

        const showClueToOperator = (clueObj: Clue) => {
            /*
            This function only shows the air date, category, and dollar value to the operator.
            The state machine will show the clue question after a timeout.
            */
            this.divClueWrapper.style.display = ""; //show
            this.divClueCategory.innerHTML = clueObj.category.title;
            this.divClueDollars.innerHTML = "$" + clueObj.value;
            // example of what format the airdate is in: "2013-01-25T12:00:00.000Z
            this.divClueAirdate.innerHTML = (new Date(clueObj.airdate)).toDateString();
            this.trAnswer.style.display = "none";
            this.divInstructions.innerHTML = "Read aloud the category and dollar value.";
        };

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

                if (xhr.status != 200) {
                    alert(`Error ${xhr.status}: ${xhr.statusText}`);
                }

                const parsed = JSON.parse(xhr.response);
                const clueObj = parsed[0];

                if (isClueValid(clueObj) && !doesQuestionHaveMultimedia(clueObj)) {

                    // remove backslashes
                    clueObj.question = clueObj.question.replace(/\\/g, "");
                    clueObj.answer = clueObj.answer.replace(/\\/g, "");
                    clueObj.category.title = clueObj.category.title.replace(/\\/g, "");

                    this.currentClueObj = clueObj;
                    showClueToOperator.call(this, clueObj);
                    this.presentation.setClueObj(clueObj);
                    // we don't actually need to return the clue object to the state machine
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

    public handleShowClueQuestion(): void {
        /*
        This method mostly is about showing the clue question to the operator.
        The clue question is already being shown in the presentation because
        the state machine changes the slide.
        */
        this.setAllTeamsState(TeamState.READING_QUESTION);

        this.divInstructions.innerHTML = "Read the question out loud. Buzzers open when you press space.";

        this.divClueQuestion.innerHTML = getClueQuestionHtmlWithSubjectInBold(this.currentClueObj);
        this.trQuestion.style.display = "";//show
        this.trAnswer.style.display = "none";

        this.buttonSkipClue.removeAttribute("disabled");

        function getClueQuestionHtmlWithSubjectInBold(clueObj: Clue): string {
            /*
            The person reading the question out loud should emphasize the subject
            of the question. Look for words that are probably the subject and make them bold.
            */
            const regex = /\b((this)|(these)|(her)|(his)|(she)|(he)|(here))\b/i; // \b is a word boundary
            const result = regex.exec(clueObj.question);

            if (result === null) {
                // didn't find any words to make bold
                return clueObj.question;
            } else {
                const startIndex = result.index;
                const foundWord = result[0];

                return clueObj.question.substring(0, startIndex)
                    + '<span class="clue-keyword">' + foundWord + '</span>'
                    + clueObj.question.substring(startIndex + foundWord.length);
            }
        }

    }

    public handleDoneReadingClueQuestion(): void {
        this.audioManager.play("doneReadingClueQuestion");
        this.trAnswer.style.display = ""; //show answer to operator
        this.divClueAnswer.innerHTML = this.currentClueObj.answer;
        this.divInstructions.innerHTML = "Wait for people to answer.";
        this.setAllTeamsState(TeamState.CAN_ANSWER);
        this.buttonSkipClue.setAttribute("disabled", "disabled");

        this.resetDurationForWaitForBuzzesState();

        this.teamArray.forEach(teamObj => teamObj.hasBuzzedForCurrentQuestion = false);
    }

    public handleShowAnswer(): void {
        this.setAllTeamsState(TeamState.BUZZERS_OFF);
        this.divInstructions.innerHTML = "Let people read the answer.";

        this.teamArray.forEach(teamObj => {
            if (!teamObj.hasBuzzedForCurrentQuestion) {
                teamObj.statistics.questionsNotBuzzed++;
            }

        });


    }

    public setAllTeamsState(targetState: TeamState, endLockout = false): void {
        this.teamArray.forEach(teamObj => teamObj.setState(targetState, endLockout));
    }

    public canTeamBuzz(keyboardEvent: KeyboardEvent): boolean {
        // press keyboard key one for team index zero
        const teamIndex = Number(keyboardEvent.key) - 1;
        return this.teamArray[teamIndex].canBuzz();
    }

    public haveAllTeamsAnswered(): boolean {
        return this.teamArray.every(teamObj => teamObj.getState() === TeamState.ALREADY_ANSWERED);
    }

    public togglePaused(): void {
        this.setPaused(!this.isPaused);
    }

    public setPaused(isPaused: boolean): void {
        this.isPaused = isPaused;
        this.divPaused.style.display = isPaused ? "" : "none";
        this.stateMachine.setPaused(isPaused);
        this.gameTimer.setPaused(isPaused);
        this.teamArray.forEach(teamObj => teamObj.setPaused(isPaused));
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
        for (let i = 0; i < parsedJson.teamDollars.length; i++) {
            const cellTeamNumber = document.createElement("td");
            cellTeamNumber.innerHTML = `Team ${i + 1}`;
            tableRowTeamNumber.appendChild(cellTeamNumber);
        }

        const tableRowTeamDollars = document.createElement("tr");
        tableDetails.appendChild(tableRowTeamDollars);
        for (let i = 0; i < parsedJson.teamDollars.length; i++) {
            const savedTeam = parsedJson.teamDollars[i];
            const cellTeamDollars = document.createElement("td");
            cellTeamDollars.innerHTML = "$" + savedTeam;
            tableRowTeamDollars.appendChild(cellTeamDollars);
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
            teamDollars: this.teamArray.map(teamObj => teamObj.getDollars())
        };

        window.localStorage.setItem(Operator.localStorageKey,
            JSON.stringify(objectToSave)
        );
        //TODO save the settings
    }

    private loadGame(parsedJson: SavedGameInLocalStorage): void {

        /*
        This in imperfect, we really want to set the timer's max
        value from settings and set the present value from the 
        saved game.
        */
        this.initGameTimer(parsedJson.gameTimerRemainingMillisec);

        this.initTeams(parsedJson.teamDollars.length);
        for (let i = 0; i < parsedJson.teamDollars.length; i++) {
            this.teamArray[i].moneySet(parsedJson.teamDollars[i], false);
        }
    }

    public handleGameEnd(): void {
        this.gameTimer.pause();

        this.audioManager.play("roundEnd").then(
            () => this.audioManager.play("musicGameEnd")
        );


        // sort teams by how much money they have
        const shallowCopy = this.teamArray.slice();
        function comparator(team1: Team, team2: Team) {
            //sort descending
            return team2.getDollars() - team1.getDollars();
        }
        shallowCopy.sort(comparator);

        const html: string[] = [];
        html.push("<table><tbody>");

        shallowCopy.forEach(teamObj => {
            html.push(
                "<tr>" +
                "<td>" + teamObj.teamName + "</td>" +
                "<td>$" + teamObj.getDollars().toLocaleString() + "</td>" +
                "</tr>"
            );
        });

        html.push("</tbody></table>");

        this.presentation.setTeamRankingHtml(html.join(""));
        this.presentation.hideHeaderAndFooter();

        /*
        const divForCharts = this.presentation.getDivForCharts();
        this.teamArray.forEach(teamObj => {
            const div = document.createElement("div");
            div.style.width = "300px";
            div.style.height = "300px";
            divForCharts.appendChild(div);

            const data: Chartist.IChartistData = {
                series: [
                    teamObj.statistics.questionsNotBuzzed,
                    teamObj.statistics.questionsBuzzedThenAnsweredRight,
                    teamObj.statistics.questionsBuzzedThenAnsweredWrongOrTimedOut
                ],
                labels: ["Not buzzed",
                    "Answered right",
                    "Answered wrong or timed out"
                ]
            };

            const options: Chartist.IPieChartOptions = {
                width: "100%",
                height: "100%",
                donut: true,
                donutWidth: "50%",
                chartPadding: 0,
                showLabel: true,
                labelPosition: "outside"
            };

            new Chartist.Pie(div, data, options);


        });
*/


    }

    private resetDurationForWaitForBuzzesState(): void {
        this.resetDurationForWaitForBuzzState = true;
    }

    public saveCountdownTimerForWaitForBuzzesState(): void {
        this.countdownTimerForWaitForBuzzesState = this.stateMachine.getCountdownTimer();
    }

    public getCountdownTimerSource(): CountdownTimerSource {
        if (this.resetDurationForWaitForBuzzState) {
            this.resetDurationForWaitForBuzzState = false;
            return { type: CountdownOperation.CreateNew, duration: this.settings.timeoutWaitForBuzzesMillisec };
        } else {
            return { type: CountdownOperation.ResumeExisting, countdownTimerToResume: this.countdownTimerForWaitForBuzzesState };
        }
    }


}
