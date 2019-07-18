/* global Team */

const NUM_TEAMS = 4;

class Operator {

    constructor(audioManager, settings) {
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

        this.currentClueObj = null;
        this.teamArray = new Array(NUM_TEAMS);

        this.isPaused = false;

        this.initKeyboardListener();
        this.initMouseListeners();

//            window.open("../presentation/presentation.html", "windowPresentation");
    }

    handlePresentationReady(presentationInstance) {
        // called from Presentation instance in other window
        this.presentationInstance = presentationInstance;
        this.initTeams();

        this.initTeamKeyboardShow();

        this.stateMachine = new StateMachine(this.settings, this, presentationInstance, this.audioManager);

        this.buttonStartGame.prop("disabled", false);
        this.divInstructions.html("Click button to start game");

    }

    initTeamKeyboardShow() {
        const numbers = ["1", "2", "3", "4"];

        window.addEventListener("keydown", keyboardEvent => {
            const key = keyboardEvent.key;
            if (numbers.includes(keyboardEvent.key)) {
                const teamIndex = Number(keyboardEvent.key) - 1;
                const teamObj = this.teamArray[teamIndex];
                teamObj.showKeyDown();
            }
        });
        window.addEventListener("keyup", keyboardEvent => {
            const key = keyboardEvent.key;
            if (numbers.includes(keyboardEvent.key)) {
                const teamIndex = Number(keyboardEvent.key) - 1;
                const teamObj = this.teamArray[teamIndex];
                teamObj.showKeyUp();
            }
        });

    }

    initKeyboardListener() {
        window.addEventListener("keydown", keyboardEvent => {
            if (keyboardEvent.key === "p") {
                this.togglePaused();
            }
        });
    }

    handleAnswerRight() {
        this.answeringTeam.handleAnswerRight(this.currentClueObj);
    }

    handleAnswerWrong() {
        this.answeringTeam.handleAnswerWrong(this.currentClueObj);
    }

    initMouseListeners() {
        $("button#go-to-game-rules").click(() => this.presentationInstance.showSlide("game-rules"));
        $("button#go-to-jeopardy-logo").click(() => this.presentationInstance.showSlide("jeopardy-logo"));
        $("button#go-to-event-cost").click(() => this.presentationInstance.showSlide("event-cost"));
        $("button#teams-hide").click(() => this.presentationInstance.setTeamsVisible(false));
        $("button#teams-show").click(() => this.presentationInstance.setTeamsVisible(true));

        this.buttonStartGame = $("button#start-game").click(() => {
            this.stateMachine.manualTrigger("startGame");
            this.buttonStartGame.prop("disabled", true);
        });


        $("button#buzzer-test-start").click(() => this.buzzerTestStart());
        $("button#buzzer-test-stop").click(() => this.buzzerTestStop());

        $("button#save-team-names").click(() => this.applyTeamNames());

        this.buttonSkipClue = $("button#skip-clue").click(() => this.skipClue());

        $("a#aMoneyOverride").click(() =>
            window.open("../moneyOverride/moneyOverride.html", "windowOverrideMoney",
                    "menubar=0,toolbar=0,location=0,personalbar=0status=0"));

    }

    skipClue() {
        this.setAllTeamsState(Team.stateEnum.BUZZERS_OFF, true);
        this.stateMachine._goToState("fetchClue");
        this.buttonSkipClue.attr("disabled", true);
        this.buttonSkipClue.blur();
    }

    applyTeamNames() {
        var inputTeamNames = new Array(NUM_TEAMS);
        for (var i = 0; i < NUM_TEAMS; i++) {
            inputTeamNames[i] = $("input#team-name-" + i);
        }
        for (var i = 0; i < NUM_TEAMS; i++) {
            this.teamArray[i].setTeamName(inputTeamNames[i].prop("value"));
        }

        this.presentationInstance.setTeamsVisible(true);
    }

    initTeams() {
        if (!this.presentationInstance) {
            console.log("can't init teams because no Presentation instance");
            return;
        }

        for (var i = 0; i < NUM_TEAMS; i++) {
            this.teamArray[i] = new Team(i, this.presentationInstance, this.settings, this.audioManager);
        }
        this.applyTeamNames();
    }

    playTimeoutSound() {
        this.audioManager.play("questionTimeout");
    }

    handleBuzzerPress(keyboardEvent) {
        const teamIndex = Number(keyboardEvent.key) - 1;
        const teamObj = this.teamArray[teamIndex];
//        this.audioTeamBuzz.play();

        this.answeringTeam = teamObj;

        this.audioManager.play("teamBuzz");

        teamObj.startAnswer();

        this.divInstructions.html("Did they answer correctly? y / n");
    }

    shouldGameEnd() {
        for (var i = 0; i < NUM_TEAMS; i++) {
            if (this.teamArray[i].dollars >= this.settings.teamDollarsWhenGameShouldEnd) {
                return true;
            }
        }
        return false;
    }

    handleLockout(keyboardEvent) {
        const teamIndex = Number(keyboardEvent.key) - 1;
        const teamObj = this.teamArray[teamIndex];
        teamObj.canBeLockedOut() && teamObj.startLockout();
    }

    getClue() {
        return new Promise((resolve, reject) => {
            this.buttonStartGame.blur();
            this.trQuestion.hide();
            this.divInstructions.html("Loading clue...");

            fetchClueHelper.call(this, 1, 5);

            function fetchClueHelper(tryNum, maxTries) {
                $.getJSON("http://jservice.io/api/random", response => {
                    var clueObj = response[0];
                    this.currentClueObj = clueObj;

                    if (isClueValid(clueObj) && !doesQuestionHaveMultimedia(clueObj)) {
                        showClue.call(this, clueObj);
                        resolve(clueObj);

                    } else {
                        if (tryNum < maxTries) {
                            fetchClueHelper.call(this, tryNum + 1, maxTries);
                        } else {
                            resolve({
                                answer: `couldn't fetch clue after ${maxTries} tries`,
                                question: `couldn't fetch clue after ${maxTries} tries`,
                                value: 0,
                                category: {title: "error"}
                            });
                        }
                    }
                });
            }
        });

        function isClueValid(clueObj) {
            return clueObj.value !== null &&
                    clueObj.question.length > 0 &&
                    clueObj.answer.length > 0 &&
                    clueObj.category !== null &&
                    clueObj.category.title.length > 0;
        }

        function doesQuestionHaveMultimedia(clueObj) {
            const questionStr = clueObj.question.toLowerCase();
            const terms = ["seen here", "heard here"];
            for (var i = 0; i < terms.length; i++) {
                if (questionStr.includes(terms[i])) {
                    return true;
                }
            }
            return false;
        }

        function showClue(clueObj) {
            this.divClueWrapper.show();
            this.divClueCategory.html(clueObj.category.title);
            this.divClueDollars.html("$" + clueObj.value);
            this.divClueAirdate.html((new Date(clueObj.airdate)).toDateString());
            this.trAnswer.hide();
            this.presentationInstance.setClueObj(clueObj);
            this.divInstructions.html("Read aloud the category and dollar value.");
        }

    }

    showClueQuestion() {
        this.presentationInstance.fitQuestionToScreen();

        this.setAllTeamsState(Team.stateEnum.READING_QUESTION);

        this.divInstructions.html("Read aloud the question. Buzzers open when you press space");

        this.divClueQuestion.html(getClueQuestionHtml(this.currentClueObj));
        this.trQuestion.show();
        this.trAnswer.hide();

        this.buttonSkipClue.attr("disabled", false);

        function getClueQuestionHtml(clueObj) {
            var clueStr = clueObj.question.replace(/\\/g, "");

            var regex = /\b(?:(?:this)|(?:these)|(?:her)|(?:his)|(?:she)|(?:he))\b/i;
            var result = regex.exec(clueStr);

            if (result === null) {
                return clueStr;
            } else {
                var startIndex = result.index;
                var foundWord = result[0];

                return clueStr.substring(0, startIndex) + '<span class="clue-keyword">' +
                        foundWord + '</span>' + clueStr.substring(startIndex + foundWord.length);
            }
        }

    }

    handleDoneReadingClueQuestion() {
        this.trAnswer.show();
        this.divClueAnswer.html(this.currentClueObj.answer);
        this.divInstructions.html("Wait for people to answer");
        this.setAllTeamsState(Team.stateEnum.CAN_ANSWER);
        this.buttonSkipClue.attr("disabled", true);
    }

    handleShowAnswer() {
        this.setAllTeamsState(Team.stateEnum.BUZZERS_OFF);
        this.divInstructions.html("Let people read the answer");
    }

    setAllTeamsState(targetState, endLockout) {
        this.teamArray.forEach(teamObj => teamObj.setState(targetState, endLockout));
    }

    canTeamBuzz(keyboardEvent) {
        const teamIndex = Number(keyboardEvent.key) - 1;
        return this.teamArray[teamIndex].canBuzz();
    }

    haveAllTeamsAnswered() {
        return this.teamArray.every(teamObj => teamObj.hasAnswered);
    }

    togglePaused() {
        this.setPaused(!this.isPaused);
    }

    setPaused(isPaused) {
        this.isPaused = isPaused;
        this.divPaused.toggle(isPaused);
        this.stateMachine.setPaused(isPaused);
        this.teamArray.forEach(teamObj => teamObj.setPaused(isPaused));
        this.presentationInstance.setPaused(isPaused);
    }

}