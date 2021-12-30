import { Team, TeamState, TeamDumpToJson } from "../Team.js";
import { StateMachine } from "../stateMachine/StateMachine.js";
import { AudioManager } from "./AudioManager.js";
import { Settings } from "../Settings.js";
import { Presentation } from "../presentation/Presentation.js";
import { Clue } from "../interfaces.js";

const TEAM_COUNT = 9;

export class Operator {
    audioManager: AudioManager;
    settings: Settings;
    presentation: Presentation;
    divClueWrapper: HTMLDivElement;
    divClueQuestion: HTMLDivElement;
    divClueDollars: HTMLDivElement;
    divClueCategory: HTMLDivElement;
    divClueAnswer: HTMLDivElement;
    divClueAirdate: HTMLDivElement;
    trQuestion: HTMLTableRowElement;
    trAnswer: HTMLTableRowElement;
    divPaused: HTMLDivElement;
    divInstructions: HTMLDivElement;
    currentClueObj: Clue;
    teamArray: Team[];
    isPaused: boolean;
    stateMachine: StateMachine;
    buttonStartGame: HTMLButtonElement;
    teamPresentlyAnswering: Team;
    buttonSkipClue: HTMLButtonElement;

    constructor(audioManager: AudioManager, settings: Settings) {
        this.audioManager = audioManager;
        this.settings = settings;


        this.presentation = null;

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

        this.currentClueObj = null;
        this.teamPresentlyAnswering = null;

        this.teamArray = new Array(TEAM_COUNT);

        this.isPaused = false;

        this.initPauseKeyboardListener();
        this.initMouseListeners();
        this.lookForSavedGame();

        window.open("../presentation/presentation.html", "windowPresentation");

        /*
        The rest of the initialization happens in this.handlePresentationReady(),
        which gets called by the Presentation instance in the window we opened.
        */
    }

    public handlePresentationReady(presentationInstanceFromOtherWindow: Presentation): void {
        /* 
        This method gets called from Presentation instance in the other window.
        */
        window.focus();
        this.presentation = presentationInstanceFromOtherWindow;
        this.initTeams();

        this.presentation.setTeamsVisible(true);

        this.initBuzzerFootswitchIconDisplay();

        this.stateMachine = new StateMachine(this.settings, this, presentationInstanceFromOtherWindow, this.audioManager);

        this.buttonStartGame.removeAttribute("disabled");
        this.divInstructions.innerHTML = "Ready. Click the button to start the game.";
    }

    private initBuzzerFootswitchIconDisplay(): void {
        /*
        Show a small picture of the footswitch used for the buzzers
        so people can verify their buzzers are working.
        */
        const teamNumbers: string[] =
            new Array(TEAM_COUNT).fill(1).map(
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

    public handleAnswerIncorrectOrAnswerTimeout(): void {
        this.teamPresentlyAnswering.handleAnswerIncorrectOrAnswerTimeout(this.currentClueObj);
    }

    private initMouseListeners(): void {
        document.querySelector("button#go-to-game-rules").addEventListener("click", () => this.presentation.showSlide("game-rules"));
        document.querySelector("button#go-to-jeopardy-logo").addEventListener("click", () => this.presentation.showSlide("jeopardy-logo"));
        document.querySelector("button#go-to-event-cost").addEventListener("click", () => this.presentation.showSlide("event-cost"));

        this.buttonStartGame.addEventListener("click", () => {
            this.stateMachine.manualTrigger("startGame");
            this.buttonStartGame.setAttribute("disabled", "disabled");
        });


        this.buttonSkipClue.addEventListener("click", () => this.skipClue());

        document.querySelector("a#aMoneyOverride").addEventListener("click", () =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney", "popup"));

    }


    public skipClue(): void {
        this.setAllTeamsState(TeamState.BUZZERS_OFF, true); // the second argument is endLockout
        this.buttonSkipClue.setAttribute("disabled", "disabled");
        this.buttonSkipClue.blur();
        this.stateMachine.goToState("fetchClue");
    }

    private initTeams(): void {
        if (!this.presentation) {
            console.warn("can't init teams because no Presentation instance!");
            return;
        }

        for (let i = 0; i < TEAM_COUNT; i++) {
            this.teamArray[i] = new Team(i, this.presentation, this.settings, this.audioManager);
        }
        this.presentation.setTeamsVisible(true);
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
    }

    public shouldGameEnd(): boolean {
        const maxDollars = this.settings.teamDollarsWhenGameShouldEnd;
        return this.teamArray.some(teamObj => teamObj.dollars >= maxDollars);
    }

    public handleLockout(keyboardEvent: KeyboardEvent): void {
        const teamIndex = Number(keyboardEvent.key) - 1;
        const teamObj = this.teamArray[teamIndex];
        teamObj.canBeLockedOut() && teamObj.startLockout();
    }

    public getClueFromJService(): Promise<void> {
        // only save the game if somebody has more than $0
        if (this.teamArray.some(teamObj => teamObj.dollars > 0)) {
            this.saveGame();
        }

        function isClueValid(clueObj: Clue): boolean {
            return clueObj.value !== null &&
                clueObj.question.length > 0 &&
                clueObj.answer.length > 0 &&
                clueObj.category !== null &&
                clueObj.category.title.length > 0;
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
            This function only shows the category. 
            The state machine will show the clue question after a timeout.
            */
            this.divClueWrapper.style.display = "";
            this.divClueCategory.innerHTML = clueObj.category.title;
            this.divClueDollars.innerHTML = "$" + clueObj.value;
            // example of what format the airdate is in: "2013-01-25T12:00:00.000Z
            this.divClueAirdate.innerHTML = (new Date(clueObj.airdate)).toDateString();
            this.presentation.setClueObj(clueObj);
            this.trAnswer.style.display = "none";
            this.divInstructions.innerHTML = "Read aloud the category and dollar value.";
        }

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
        }


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
        }
        return new Promise<void>(promiseExecutor);

    }

    public showClueQuestion(): void {
        /*
        The presentation is already showing the clue question because of the
        slide change in the state machine.
        */
        this.presentation.fitClueQuestionToScreen();

        this.setAllTeamsState(TeamState.READING_QUESTION);

        this.divInstructions.innerHTML = "Read the question out loud. Buzzers open when you press space.";

        this.divClueQuestion.innerHTML = getClueQuestionHtmlWithSubjectInBold(this.currentClueObj);
        this.trQuestion.style.display = "";
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
        this.trAnswer.style.display = ""; //show answer to operator
        this.divClueAnswer.innerHTML = this.currentClueObj.answer;
        this.divInstructions.innerHTML = "Wait for people to answer.";
        this.setAllTeamsState(TeamState.CAN_ANSWER);
        this.buttonSkipClue.setAttribute("disabled", "disabled");
    }

    public handleShowAnswer(): void {
        this.setAllTeamsState(TeamState.BUZZERS_OFF);
        this.divInstructions.innerHTML = "Let people read the answer.";
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
        return this.teamArray.every(teamObj => teamObj.state === TeamState.ALREADY_ANSWERED);
    }

    public togglePaused(): void {
        this.setPaused(!this.isPaused);
    }

    public setPaused(isPaused: boolean): void {
        this.isPaused = isPaused;
        this.divPaused.style.display = isPaused ? "" : "none";
        this.stateMachine.setPaused(isPaused);
        this.teamArray.forEach(teamObj => teamObj.setPaused(isPaused));
        this.presentation.setPaused(isPaused);
    }

    private lookForSavedGame(): void {
        const divSavedGame = document.querySelector<HTMLDivElement>("div#saved-game-prompt");

        const rawLocalStorageResult = window.localStorage.getItem("jeopardy-teams");
        if (rawLocalStorageResult === null) {
            divSavedGame.style.display = "none";
            return;
        }

        const tableDetails = document.querySelector("table#saved-game-details tbody");

        const parsed = JSON.parse(rawLocalStorageResult);

        parsed.forEach(function (savedTeam: TeamDumpToJson) {
            const tableRow = document.createElement("tr");
            tableDetails.appendChild(tableRow);

            const cellTeamName = document.createElement("td");
            cellTeamName.innerHTML = savedTeam.name;
            cellTeamName.classList.add("team-name");
            tableRow.appendChild(cellTeamName);

            const cellTeamDollars = document.createElement("td");
            cellTeamDollars.innerHTML = "$" + savedTeam.dollars;
            tableRow.appendChild(cellTeamDollars);
        });

        document.querySelector("button#saved-game-load").addEventListener("click", () => {
            this.loadGame();
            divSavedGame.style.display = "none";
        });
        document.querySelector("button#saved-game-delete").addEventListener("click", function () {
            if (window.confirm("Delete the saved game?")) {
                window.localStorage.removeItem("jeopardy-teams");
                divSavedGame.style.display = "none";
            }
        });
        document.querySelector("button#saved-game-dismiss").addEventListener("click", () => divSavedGame.style.display = "none");


    }

    private saveGame(): void {
        window.localStorage.setItem("jeopardy-teams",
            JSON.stringify(
                this.teamArray.map(teamObj => teamObj.jsonDump())
            )
        );
        //TODO save the settings
    }

    private loadGame(): void {
        const storageContents = window.localStorage.getItem("jeopardy-teams");
        if (!storageContents) {
            console.warn("The saved game JSON is null");
            return;
        }
        const parsed = JSON.parse(storageContents);
        for (let i = 0; i < parsed.length; i++) {
            this.teamArray[i].jsonLoad(parsed[i]);
        }
    }

    public handleGameEnd(): void {

        this.audioManager.play("musicClosing");

        // sort teams by how much money they have
        const shallowCopy = this.teamArray.slice();
        function comparator(team1: Team, team2: Team) {
            //sort descending
            return team2.dollars - team1.dollars;
        }
        shallowCopy.sort(comparator);

        const html: string[] = [];
        html.push("<table><tbody>");

        shallowCopy.forEach(teamObj => {
            html.push(
                "<tr>" +
                "<td>" + teamObj.teamName + "</td>" +
                "<td>$" + teamObj.dollars.toLocaleString() + "</td>" +
                "</tr>"
            );
        });

        html.push("</tbody></table>");

        this.presentation.setGameEndMessage(html.join(""));
        this.presentation.headerHide();
    }



}