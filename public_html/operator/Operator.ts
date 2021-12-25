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
    divClueWrapper: JQuery<HTMLDivElement>;
    divClueQuestion: JQuery<HTMLDivElement>;
    divClueDollars: JQuery<HTMLDivElement>;
    divClueCategory: JQuery<HTMLDivElement>;
    divClueAnswer: JQuery<HTMLDivElement>;
    divClueAirdate: JQuery<HTMLDivElement>;
    trQuestion: JQuery<HTMLTableRowElement>;
    trAnswer: JQuery<HTMLTableRowElement>;
    divPaused: JQuery<HTMLDivElement>;
    divInstructions: JQuery<HTMLDivElement>;
    currentClueObj: Clue;
    teamArray: Team[];
    isPaused: boolean;
    stateMachine: StateMachine;
    buttonStartGame: JQuery<HTMLButtonElement>;
    teamPresentlyAnswering: Team;
    buttonSkipClue: JQuery<HTMLButtonElement>;

    constructor(audioManager: AudioManager, settings: Settings) {
        this.audioManager = audioManager;
        this.settings = settings;


        this.presentation = null;

        this.divClueWrapper = $("div#clue");
        this.divClueQuestion = $("div#clue-question");
        this.divClueDollars = $("div#clue-dollars");
        this.divClueCategory = $("div#clue-category");
        this.divClueAnswer = $("div#clue-answer");
        this.divClueAirdate = $("div#clue-airdate");
        this.trQuestion = $("tr#question");
        this.trAnswer = $("tr#answer");
        this.divPaused = $("div#paused");
        this.divInstructions = $("div#instructions");
        this.buttonStartGame = $("button#start-game");
        this.buttonSkipClue = $("button#skip-clue");

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

        this.buttonStartGame.prop("disabled", false);
        this.divInstructions.html("Ready. Click the button to start the game.");
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
        $("button#go-to-game-rules").on("click", () => this.presentation.showSlide("game-rules"));
        $("button#go-to-jeopardy-logo").on("click", () => this.presentation.showSlide("jeopardy-logo"));
        $("button#go-to-event-cost").on("click", () => this.presentation.showSlide("event-cost"));

        this.buttonStartGame.on("click", () => {
            this.stateMachine.manualTrigger("manualTrigger_startGame");
            this.buttonStartGame.prop("disabled", true);
        });


        this.buttonSkipClue.on("click", () => this.skipClue());

        $("a#aMoneyOverride").on("click", () =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney", "popup"));

    }


    public skipClue(): void {
        this.setAllTeamsState(TeamState.BUZZERS_OFF, true); // the second argument is endLockout
        this.buttonSkipClue.attr("disabled", "true");
        this.buttonSkipClue.trigger("blur");
        this.stateMachine.goToState("state_fetchClue");
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

        this.divInstructions.html("Did they answer correctly? y / n");
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

    public getClueFromJService() {
        // only same the game if somebody has more than $0
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
            this.divClueWrapper.show();
            this.divClueCategory.html(clueObj.category.title);
            this.divClueDollars.html("$" + clueObj.value);
            // example of what format the airdate is in: "2013-01-25T12:00:00.000Z
            this.divClueAirdate.html((new Date(clueObj.airdate)).toDateString());
            this.presentation.setClueObj(clueObj);
            this.trAnswer.hide();
            this.divInstructions.html("Read aloud the category and dollar value.");
        }

        const fetchClueHelper = (promiseResolveFunc: (arg0: Clue) => void, tryNum: number, maxTries: number) => {
            $.getJSON("http://jservice.io/api/random", response => {
                const clueObj = response[0];
                this.currentClueObj = clueObj;

                if (isClueValid(clueObj) && !doesQuestionHaveMultimedia(clueObj)) {
                    showClueToOperator.call(this, clueObj);
                    promiseResolveFunc(clueObj);
                } else {
                    if (tryNum < maxTries) {
                        fetchClueHelper.call(this, promiseResolveFunc, tryNum + 1, maxTries);
                    } else {
                        // Would make sense to call the promise reject function?
                        // But then a function somewhere down the line has to generate
                        // this error message.
                        promiseResolveFunc({
                            answer: `couldn't fetch clue after ${maxTries} tries`,
                            question: `couldn't fetch clue after ${maxTries} tries`,
                            value: 0,
                            airdate: null,
                            category: { title: "error" }
                        });
                    }
                }
            });
        }

        return new Promise((resolve, reject) => {
            this.buttonStartGame.trigger("blur");
            this.trQuestion.hide();
            this.divInstructions.html("Loading clue...");
            fetchClueHelper.call(this, resolve, 1, 5);
        });

    }

    public showClueQuestion(): void {
        /*
        The presentation is already showing the clue question because of the
        slide change in the state machine.
        */
        this.presentation.fitClueQuestionToScreen();

        this.setAllTeamsState(TeamState.READING_QUESTION);

        this.divInstructions.html("Read the question out loud. Buzzers open when you press space.");

        this.divClueQuestion.html(getClueQuestionHtmlWithSubjectInBold(this.currentClueObj));
        this.trQuestion.show();
        this.trAnswer.hide();

        this.buttonSkipClue.attr("disabled", "false");

        function getClueQuestionHtmlWithSubjectInBold(clueObj: Clue): string {
            /*
            The person reading the question out loud should emphasize the subject
            of the question. Look for words that are probably the subject and make them bold.
            */
            const clueQuestionString = clueObj.question.replace(/\\/g, ""); // sometime's there's a backslash

            const regex = /\b((this)|(these)|(her)|(his)|(she)|(he)|(here))\b/i; // \b is a word boundary
            const result = regex.exec(clueQuestionString);

            if (result === null) {
                return clueQuestionString;
            } else {
                const startIndex = result.index;
                const foundWord = result[0];

                return clueQuestionString.substring(0, startIndex)
                    + '<span class="clue-keyword">' + foundWord + '</span>'
                    + clueQuestionString.substring(startIndex + foundWord.length);
            }
        }

    }

    public handleDoneReadingClueQuestion(): void {
        this.trAnswer.show(); //show answer to operator
        this.divClueAnswer.html(this.currentClueObj.answer);
        this.divInstructions.html("Wait for people to answer.");
        this.setAllTeamsState(TeamState.CAN_ANSWER);
        this.buttonSkipClue.attr("disabled", "true");
    }

    public handleShowAnswer(): void {
        this.setAllTeamsState(TeamState.BUZZERS_OFF);
        this.divInstructions.html("Let people read the answer.");
    }

    public setAllTeamsState(targetState: TeamState, endLockout: boolean = false): void {
        this.teamArray.forEach(teamObj => teamObj.setState(targetState, endLockout));
    }

    public canTeamBuzz(keyboardEvent: KeyboardEvent): boolean {
        // press keyboard key one for team index zero
        const teamIndex = Number(keyboardEvent.key) - 1;
        return this.teamArray[teamIndex].canBuzz();
    }

    public haveAllTeamsAnswered(): boolean {
        return this.teamArray.every(teamObj => teamObj.hasAnswered);
    }

    public togglePaused(): void {
        this.setPaused(!this.isPaused);
    }

    public setPaused(isPaused: boolean): void {
        this.isPaused = isPaused;
        this.divPaused.toggle(isPaused);
        this.stateMachine.setPaused(isPaused);
        this.teamArray.forEach(teamObj => teamObj.setPaused(isPaused));
        this.presentation.setPaused(isPaused);
    }

    private lookForSavedGame(): void {
        const divSavedGame = $("div#saved-game-prompt");

        const rawLocalStorageResult = window.localStorage.getItem("jeopardy-teams");
        if (rawLocalStorageResult === null) {
            divSavedGame.hide();
            return;
        }

        const tableDetails = $("table#saved-game-details tbody");

        const parsed = JSON.parse(rawLocalStorageResult);

        parsed.forEach(function (savedTeam: TeamDumpToJson) {
            const tr = $("<tr>").appendTo(tableDetails);
            $("<td>").html(savedTeam.name).addClass("team-name").appendTo(tr);
            $("<td>").html("$" + savedTeam.dollars).appendTo(tr);
        });

        $("button#saved-game-load").on("click", () => {
            this.loadGame();
            divSavedGame.hide();
        });
        $("button#saved-game-delete").on("click", function () {
            if (window.confirm("Delete the saved game?")) {
                window.localStorage.removeItem("jeopardy-teams");
                divSavedGame.hide();
            }
        });
        $("button#saved-game-dismiss").on("click", () => divSavedGame.hide());


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
        let shallowCopy = this.teamArray.slice();
        function comparator(team1: Team, team2: Team) {
            //sort descending
            return team2.dollars - team1.dollars;
        }
        shallowCopy.sort(comparator);

        let html = "<table><tbody>";
        shallowCopy.forEach(teamObj => {
            html += ("<tr><td>" + teamObj.teamName + "</td><td>$" +
                teamObj.dollars.toLocaleString() + "</td></tr>");
        });
        html += "</tbody></table>";

        this.presentation.setGameEndMessage(html);
        this.presentation.headerHide();
    }



}