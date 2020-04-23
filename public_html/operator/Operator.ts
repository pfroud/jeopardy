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
    presentationInstance: Presentation;
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
    answeringTeam: Team;
    buttonSkipClue: JQuery<HTMLButtonElement>;

    constructor(audioManager: AudioManager, settings: Settings) {
        this.audioManager = audioManager;
        this.settings = settings;


        this.presentationInstance = null;

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
        this.answeringTeam = null;

        this.teamArray = new Array(TEAM_COUNT);

        this.isPaused = false;

        this.initKeyboardListener();
        this.initMouseListeners();

        window.open("../presentation/presentation.html", "windowPresentation");

        this.lookForSavedGame();
    }

    public handlePresentationReady(presentationInstance: Presentation): void {
        // called from Presentation instance in other window
        this.presentationInstance = presentationInstance;
        this.initTeams();

        this.presentationInstance.setTeamsVisible(true);

        this.initTeamKeyboardShow();

        this.stateMachine = new StateMachine(this.settings, this, presentationInstance, this.audioManager);

        this.buttonStartGame.prop("disabled", false);
        this.divInstructions.html("Click button to start game");

        window.focus();

    }

    private initTeamKeyboardShow(): void {
        const numbers: string[] =
            new Array(9).fill(1).map(
                (elem, index) => String(index + 1)
            );

        window.addEventListener("keydown", keyboardEvent => {
            const theKey = keyboardEvent.key;
            if (numbers.includes(theKey)) {
                const teamIndex = Number(theKey) - 1;
                const teamObj = this.teamArray[teamIndex];
                teamObj.showKeyDown();
            }
        });
        window.addEventListener("keyup", keyboardEvent => {
            const theKey = keyboardEvent.key;
            if (numbers.includes(theKey)) {
                const teamIndex = Number(theKey) - 1;
                const teamObj = this.teamArray[teamIndex];
                teamObj.showKeyUp();
            }
        });

    }

    private initKeyboardListener(): void {
        window.addEventListener("keydown", keyboardEvent => {
            if (keyboardEvent.key === "p") {
                this.togglePaused();
            }
        });
    }

    public handleAnswerRight(): void {
        this.answeringTeam.handleAnswerRight(this.currentClueObj);
    }

    public handleAnswerWrong(): void {
        this.answeringTeam.handleAnswerWrong(this.currentClueObj);
    }

    private initMouseListeners(): void {
        $("button#go-to-game-rules").click(() => this.presentationInstance.showSlide("game-rules"));
        $("button#go-to-jeopardy-logo").click(() => this.presentationInstance.showSlide("jeopardy-logo"));
        $("button#go-to-event-cost").click(() => this.presentationInstance.showSlide("event-cost"));
        $("button#teams-hide").click(() => this.presentationInstance.setTeamsVisible(false));
        $("button#teams-show").click(() => this.presentationInstance.setTeamsVisible(true));

        this.buttonStartGame.click(() => {
            this.stateMachine.manualTrigger("manualTrigger_startGame");
            this.buttonStartGame.prop("disabled", true);
        });


        this.buttonSkipClue.click(() => this.skipClue());

        $("a#aMoneyOverride").click(() =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney",
                "menubar=0,toolbar=0,location=0,personalbar=0status=0"));

    }


    public skipClue(): void {
        this.setAllTeamsState(TeamState.BUZZERS_OFF, true);
        this.stateMachine.goToState("state_fetchClue");
        this.buttonSkipClue.attr("disabled", "true");
        this.buttonSkipClue.blur();
    }

    private initTeams(): void {
        if (!this.presentationInstance) {
            console.log("can't init teams because no Presentation instance");
            return;
        }

        for (let i = 0; i < TEAM_COUNT; i++) {

            const teamDivOperator = this._createTeamDivOperator(i);

            this._createTeamDivPresentation(i);


            const theTeam = this.teamArray[i] =
                new Team(i, this.presentationInstance, this.settings, this.audioManager);

            const teamNameInput: JQuery<HTMLInputElement> = $("input#team-name-" + i);
            teamNameInput.on("input", function () {
                theTeam.setTeamName(this.value);
            });
        }
        this.presentationInstance.setTeamsVisible(true);
    }

    private _createTeamDivOperator(teamIdx: number): void {
        const divTeam = $("<div>")
            .addClass("team")
            .attr("data-team-index", teamIdx)
            .attr("data-team-state", "");


        divTeam.append($("<div>").addClass("team-name"));
        divTeam.append($("<div>").addClass("team-dollars"));
        divTeam.append($("<div>").addClass("team-state"));

        divTeam.append($("<progress>").addClass("time-left").css("display:none"));

        $("footer").append(divTeam);
    }

    private _createTeamDivPresentation(teamIdx: number): void {
        const divTeam = $("<div>")
            .addClass("team")
            .attr("data-team-index", teamIdx)
            .attr("data-team-state", "");

        const divBuzzerDisplay = $("<div>").addClass("buzzer-show").addClass("not-pressed");

        const imgSwitchClosed = $("<img>")
            .attr("src", "img/switch-closed.svg")
            .attr("attr", "switch closed")
            .addClass("buzzer-pressed");

        const imgSwitchOpened = $("<img>")
            .attr("src", "img/switch-opened.svg")
            .attr("attr", "switch opened")
            .addClass("buzzer-not-pressed");

        divBuzzerDisplay.append(imgSwitchClosed);
        divBuzzerDisplay.append(imgSwitchOpened);
        divTeam.append(divBuzzerDisplay);

        const tableCountdownDots = $("<table>").addClass("countdown-dots");

        for (let i = 5; i > 1; i--) {
            tableCountdownDots.append($("<td>").attr("data-countdown", i));
        }
        tableCountdownDots.append($("<td>").attr("data-countdown", 1));
        for (let i = 2; i <= 5; i++) {
            tableCountdownDots.append($("<td>").attr("data-countdown", i));
        }

        divTeam.append(tableCountdownDots);

        divTeam.append($("<div>").addClass("team-dollars"));
        divTeam.append($("<div>").addClass("team-name"));
        divTeam.append($("<progress>"));

        this.presentationInstance.footerTeams.append(divTeam);
    }

    public playTimeoutSound(): void {
        this.audioManager.play("questionTimeout");
    }

    public handleBuzzerPress(keyboardEvent: KeyboardEvent): void {
        const teamIndex = Number(keyboardEvent.key) - 1;
        const teamObj = this.teamArray[teamIndex];
        //        this.audioTeamBuzz.play();

        this.answeringTeam = teamObj;

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

    public getClue() {
        if (this.teamArray.some(teamObj => teamObj.dollars > 0)) {
            // only same the game if somebody has more than $0
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
            const questionStr = clueObj.question.toLowerCase();
            const terms = ["seen here", "heard here"];
            for (let i = 0; i < terms.length; i++) {
                if (questionStr.includes(terms[i])) {
                    return true;
                }
            }
            return false;
        }

        const showClue = (clueObj: Clue) => {
            this.divClueWrapper.show();
            this.divClueCategory.html(clueObj.category.title);
            this.divClueDollars.html("$" + clueObj.value);
            this.divClueAirdate.html((new Date(clueObj.airdate)).toDateString());
            this.trAnswer.hide();
            this.presentationInstance.setClueObj(clueObj);
            this.divInstructions.html("Read aloud the category and dollar value.");
        }

        const fetchClueHelper = (promiseResolveFunc: (arg0: Clue)=>void, tryNum: number, maxTries: number) => {
            $.getJSON("http://jservice.io/api/random", response => {
                const clueObj = response[0];
                this.currentClueObj = clueObj;

                if (isClueValid(clueObj) && !doesQuestionHaveMultimedia(clueObj)) {
                    showClue.call(this, clueObj);
                    promiseResolveFunc(clueObj);
                } else {
                    if (tryNum < maxTries) {
                        fetchClueHelper.call(this, promiseResolveFunc, tryNum + 1, maxTries);
                    } else {
                        // Would make sense to call the promise reject function,
                        // but then a function somewhere down the line has to generate
                        // this error message
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
            this.buttonStartGame.blur();
            this.trQuestion.hide();
            this.divInstructions.html("Loading clue...");
            fetchClueHelper.call(this, resolve, 1, 5);
        });

    }

    public showClueQuestion(): void {
        this.presentationInstance.fitQuestionToScreen();

        this.setAllTeamsState(TeamState.READING_QUESTION);

        this.divInstructions.html("Read aloud the question. Buzzers open when you press space");

        this.divClueQuestion.html(getClueQuestionHtml(this.currentClueObj));
        this.trQuestion.show();
        this.trAnswer.hide();

        this.buttonSkipClue.attr("disabled", "false");

        function getClueQuestionHtml(clueObj: Clue): string {
            const clueStr = clueObj.question.replace(/\\/g, "");

            const regex = /\b(?:(?:this)|(?:these)|(?:her)|(?:his)|(?:she)|(?:he))\b/i;
            const result = regex.exec(clueStr);

            if (result === null) {
                return clueStr;
            } else {
                const startIndex = result.index;
                const foundWord = result[0];

                return clueStr.substring(0, startIndex) + '<span class="clue-keyword">' +
                    foundWord + '</span>' + clueStr.substring(startIndex + foundWord.length);
            }
        }

    }

    public handleDoneReadingClueQuestion(): void {
        this.trAnswer.show();
        this.divClueAnswer.html(this.currentClueObj.answer);
        this.divInstructions.html("Wait for people to answer");
        this.setAllTeamsState(TeamState.CAN_ANSWER);
        this.buttonSkipClue.attr("disabled", "true");
    }

    public handleShowAnswer(): void {
        this.setAllTeamsState(TeamState.BUZZERS_OFF);
        this.divInstructions.html("Let people read the answer");
    }

    public setAllTeamsState(targetState: TeamState, endLockout: boolean = false): void {
        this.teamArray.forEach(teamObj => teamObj.setState(targetState, endLockout));
    }

    public canTeamBuzz(keyboardEvent: KeyboardEvent): boolean {
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
        this.presentationInstance.setPaused(isPaused);
    }

    private lookForSavedGame(): void {
        const divSavedGame = $("div#saved-game-prompt");

        const raw = window.localStorage.getItem("jeopardy-teams");
        if (raw === null) {
            divSavedGame.hide();
            return;
        }

        const tableDetails = $("table#saved-game-details tbody");

        const parsed = JSON.parse(raw);

        parsed.forEach(function (savedTeam: TeamDumpToJson) {
            const tr = $("<tr>").appendTo(tableDetails);
            $("<td>").html(savedTeam.name).addClass("team-name").appendTo(tr);
            $("<td>").html("$" + savedTeam.dollars).appendTo(tr);
        });

        $("button#saved-game-load").click(() => {
            this.loadGame();
            divSavedGame.hide();
        });
        $("button#saved-game-delete").click(function () {
            if (window.confirm("Delete the saved game?")) {
                window.localStorage.removeItem("jeopardy-teams");
                divSavedGame.hide();
            }
        });
        $("button#saved-game-dismiss").click(() => divSavedGame.hide());


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

        this.presentationInstance.setGameEndMessage(html);
        this.presentationInstance.headerHide();
    }

}