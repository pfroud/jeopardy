/* global SETTINGS, fsm, stateMachine, Team */

const NUM_TEAMS = 4;

var pres;

class Operator {

    constructor() {
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

//        this.initKeyboardListeners();
        this.initMouseListeners();
        window.open("../presentation/presentation.html", "windowPresentation");
    }

    handleAnswerRight() {
        this.answeringTeam.handleAnswerRight(this.currentClueObj);
    }

    handleAnswerWrong() {
        this.answeringTeam.handleAnswerWrong(this.currentClueObj);
    }

    initMouseListeners() {
        /*
         $("button#go-to-game-rules").click(() => this.presentationInstance.showSlide("game-rules"));
         $("button#go-to-jeopardy-logo").click(() => this.presentationInstance.showSlide("jeopardy-logo"));
         $("button#go-to-event-cost").click(() => this.presentationInstance.showSlide("event-cost"));
         $("button#teams-hide").click(() => this.presentationInstance.setTeamsVisible(false));
         $("button#teams-show").click(() => this.presentationInstance.setTeamsVisible(true));
         */

        this.buttonStartGame = $("button#start-game").click(() => stateMachine.manualTrigger("startGame"));

        /*
         $("button#buzzer-test-start").click(() => this.buzzerTestStart());
         $("button#buzzer-test-stop").click(() => this.buzzerTestStop());
         
         $("button#save-team-names").click(() => this.saveTeamNames());
         this.buttonSkipClue = $("button#skip-clue").click(() => this.skipClue());
         */
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

    handlePresentationReady(presentationInstance) {
        // called from Presentation instance in other window
        this.presentationInstance = presentationInstance;
        pres = presentationInstance;
        this.initTeams();

        this.buttonStartGame.prop("disabled", false);
        this.divInstructions.html("Click button to start game");

    }

    initTeams() {
        if (!this.presentationInstance) {
            console.log("can't init teams because no Presentation instance");
            return;
        }

        for (var i = 0; i < NUM_TEAMS; i++) {
            this.teamArray[i] = new Team(i, this.presentationInstance);
        }
        this.applyTeamNames();
    }

    handleBuzzerPressNew(keyboardEvent) {
        const teamIndex = Number(keyboardEvent.key) - 1;
        const teamObj = this.teamArray[teamIndex];
//        this.audioTeamBuzz.play();

        this.answeringTeam = teamObj;

        teamObj.startAnswer();

        this.divInstructions.html("Did they answer correctly? y / n");
    }

    shouldGameEnd() {
        console.log("returning false for shouldGameEnd");
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
            //        this.setAllBuzzersIsOpen(false);

            //todo validate response

            $.getJSON("http://jservice.io/api/random", response => {
                const clueObj = response[0];
                // todo ensure the response isn't messed up
                this.currentClueObj = clueObj;

                this.divClueWrapper.show();
                this.divClueCategory.html(clueObj.category.title);
                this.divClueDollars.html("$" + clueObj.value);
                this.trAnswer.hide();
                this.presentationInstance.setClueObj(clueObj);
//                this.presentationInstance.showSlide("pre-question");
                this.divInstructions.html("Read aloud the category and dollar value.");

                /*
                 var countdownShowCategory = this.currentCountdownTimer = new CountdownTimer(SETTINGS.displayDurationCategory);
                 countdownShowCategory.progressElement = this.progressPrimary;
                 countdownShowCategory.onFinished = () => this.showClueQuestion(clueObj);
                 countdownShowCategory.onPause = () => this.pause();
                 countdownShowCategory.onResume = () => this.resume();
                 countdownShowCategory.start();
                 */


                resolve(response[0]);

                function isClueValid(clueObj) {
                    return clueObj.value !== null &&
                            clueObj.question.length > 0 &&
                            clueObj.answer.length > 0 &&
                            clueObj.category !== null &&
                            clueObj.category.title.length > 0;
                }
            });

        });
    }
    /*
     
     
     
     
     if (!isClueValid(clueObj)) {
     this.getClue();
     return;
     }
     
     
     function isClueValid(clueObj) {
     return clueObj.value !== null &&
     clueObj.question.length > 0 &&
     clueObj.answer.length > 0 &&
     clueObj.category !== null &&
     clueObj.category.title.length > 0
     ;
     }
     //        });
     }
     */



    showClueQuestion() {
        this.presentationInstance.fitQuestionToScreen();

        this.setAllTeamsState(Team.stateEnum.READING_QUESTION);

        this.divInstructions.html("Read aloud the question. Buzzers open when you press space");

        this.divClueQuestion.html(getClueQuestionHtml(this.currentClueObj));
        this.trQuestion.show();
        this.trAnswer.hide();

//        this.isClueQuestionBeingRead = true;
        // then wait for spacebar to be pressed. that calls handleDoneReadingClueQuestion()

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

    /*
     setAllBuzzersIsOpen(isOpen) {
     this.teamArray.forEach(team => {
     if (!team.isLockedOut) {
     team.setBuzzerOpen(isOpen);
     }
     team.hasAnswered = false;
     
     });
     }
     * 
     */

    pause() {
        this.setPaused(true);
    }

    resume() {
        this.setPaused(false);
    }

    setPaused(isPaused) {
        this.isPaused = isPaused;
        this.divPaused.toggle(isPaused);
        this.presentationInstance.setPaused(isPaused);
    }

}