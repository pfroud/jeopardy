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
//        this.divClueAirdate = $("div#clue-airdate");
        this.trQuestion = $("tr#question");
        this.trAnswer = $("tr#answer");
        this.divPaused = $("div#paused");
        this.divInstructions = $("div#instructions");

        this.currentClueObj = null;
        this.teamArray = new Array(NUM_TEAMS);

        this.isPaused = false;

        this.initKeyboardListener();
        this.initMouseListeners();
        
        window.open("../presentation/presentation.html", "windowPresentation");
    }

    handlePresentationReady(presentationInstance) {
        // called from Presentation instance in other window
        this.presentationInstance = presentationInstance;
        this.initTeams();

        this.stateMachine = new StateMachine(this.settings, this, presentationInstance, this.audioManager);

        this.buttonStartGame.prop("disabled", false);
        this.divInstructions.html("Click button to start game");

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

        this.buttonStartGame = $("button#start-game").click(() => this.stateMachine.manualTrigger("startGame"));


        $("button#buzzer-test-start").click(() => this.buzzerTestStart());
        $("button#buzzer-test-stop").click(() => this.buzzerTestStop());

        $("button#save-team-names").click(() => this.applyTeamNames());
//         this.buttonSkipClue = $("button#skip-clue").click(() => this.skipClue());

    }

    /*
     buzzerTestStart() {
     this.buzzerTest = true;
     $("span#buzzer-test-message").show();
     this.presentationInstance.showSlide("buzzer-test");
     }
     
     buzzerTestStop() {
     this.buzzerTest = false;
     $("span#buzzer-test-message").hide();
     this.presentationInstance.showSlide("jeopardy-logo"); //i guess
     }
     */

    skipClue() {
        if (this.isATeamAnswering) {
            return;
        }

        this.buttonSkipClue.blur();
        this.currentCountdownTimer && this.currentCountdownTimer.reset();
        this.getClue();

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

                    if (isClueValid.call(this, clueObj)) {
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

        function showClue(clueObj) {
            this.divClueWrapper.show();
            this.divClueCategory.html(clueObj.category.title);
            this.divClueDollars.html("$" + clueObj.value);
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

        function getClueQuestionHtml(clueObj) {
            var clueStr = clueObj.question;

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

    handleDoneReadingClueQuestionNew() {
        this.trAnswer.show();
        this.divClueAnswer.html(this.currentClueObj.answer);
        this.divInstructions.html("Wait for people to answer");
        this.setAllTeamsState(Team.stateEnum.CAN_ANSWER);
    }

    handleShowAnswer() {
        this.setAllTeamsState(Team.stateEnum.BUZZERS_OFF);
        this.divInstructions.html("Let people read the answer");
    }

    setAllTeamsState(targetState) {
        this.teamArray.forEach(teamObj => teamObj.setState(targetState));
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