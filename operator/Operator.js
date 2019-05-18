/* global SETTINGS, fsm */

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

        this.progressPrimary = $("progress#primary");


        this.currentClueObj = null;
        this.currentCountdownTimer = null;

        this.teamArray = new Array(NUM_TEAMS);

        this.isPaused = false;

//        this.initKeyboardListeners();
        this.initMouseListeners();
        window.open("../presentation/presentation.html", "windowPresentation");
    }

    initKeyboardListeners() {
        window.addEventListener("keydown", event => {
            switch (event.key) {
                case "1":
                case "2":
                case "3":
                case "4":
                    const teamIdx = Number(event.key) - 1; //team zero buzzes by pressing the key for digit one
                    this.handleBuzzerPress(teamIdx);
                    break;

                case "p":
                    this.currentCountdownTimer && this.currentCountdownTimer.togglePaused();
                    break;

                case "y":
                    this.handleAnswer(true);
                    break;

                case "n":
                    this.handleAnswer(false);
                    break;

                case " ": //space
                    this.handleDoneReadingClueQuestion();
                    break;
            }
        });
        window.addEventListener("keyup", event => {
            switch (event.key) {
                case "1":
                case "2":
                case "3":
                case "4":
                    const teamIdx = Number(event.key) - 1; //team zero buzzes by pressing key for digit one
                    this.handleBuzzerRelease(teamIdx);
                    break;
            }
        });
    }

    handleAnswer(isCorrect) {

        if (!this.isClueQuestionAnswerable || this.isPaused || !this.isATeamAnswering) {
            return;
        }

        var teamObj = this.answeringTeam;
        var clueObj = this.currentClueObj;

        if (isCorrect) {
            teamObj.moneyAdd(clueObj.value);

            this.audioAnswerCorrect.play();

            teamObj.setIsAnswering(false);
            this.isATeamAnswering = false;

            this.currentCountdownTimer.reset(); //countdown for that team's answer
            this.countdownQuestionTimeout.reset();

            this.divInstructions.html("Let people read question now that they know the answer");
            window.setTimeout(() => {
                this.divInstructions.html("Let people read answer");
                this.presentationInstance.showSlideClueAnswer();
                window.setTimeout(() => {
                    this.getClue();
                }, 2000);
            }, 1000);



        } else {
            teamObj.moneySubtract(clueObj.value * SETTINGS.incorrectAnswerPenaltyMultiplier);
            this.audioAnswerIncorrect.play();

            teamObj.setIsAnswering(false);
            this.isATeamAnswering = false;
            teamObj.setBuzzerOpen(SETTINGS.isAllowedMultipleTries);

            // TODO do this check when team answer times out
            if (this.teamArray.every(teamObj => teamObj.hasAnswered)) {
                this.divInstructions.html("Everyone answered wrong.");
                this.setAllBuzzersIsOpen(false);
                this.isClueQuestionAnswerable = false;
                this.currentCountdownTimer.reset(); //stop counting down team's answer
                this.currentCountdownTimer = null;

                this.presentationInstance.showSlideClueAnswer();

                var countdownNextClue = this.currentCountdownTimer = new CountdownTimer(SETTINGS.displayDurationAnswer);
                countdownNextClue.progressElement = this.progressPrimary;
                countdownNextClue.onFinished = () => this.getClue();
                countdownNextClue.onPause = () => this.pause();
                countdownNextClue.onResume = () => this.resume();
                countdownNextClue.start();
            } else {
                this.currentCountdownTimer.reset(); //countdown for that team's answer
                this.divInstructions.html("Wait for people to answer.");
                this.countdownQuestionTimeout.resume();
                this.currentCountdownTimer = this.countdownQuestionTimeout;
            }


        }

    }

    initMouseListeners() {
        $("button#goToGameRules").click(() => this.presentationInstance.showSlideGameRules());
        $("button#goToJeopardyLogo").click(() => this.presentationInstance.showSlideJeopardyLogo());
        $("button#goToEventCost").click(() => this.presentationInstance.showSlideEventCost());
        $("button#teamsHide").click(() => this.presentationInstance.setTeamsVisible(false));
        $("button#teamsShow").click(() => this.presentationInstance.setTeamsVisible(true));

        this.buttonStartGame = $("button#startGame").click(() => stateMachine.startGame());

        $("button#buzzerTestStart").click(() => this.buzzerTestStart());
        $("button#buzzerTestStop").click(() => this.buzzerTestStop());

        $("button#saveTeamNames").click(() => this.saveTeamNames());
        this.buttonSkipClue = $("button#skipClue").click(() => this.skipClue());
    }

    buzzerTestStart() {
        this.buzzerTest = true;
        $("span#buzzerTestMessage").show();
        this.presentationInstance.showSlideBuzzerTest();
    }

    buzzerTestStop() {
        this.buzzerTest = false;
        $("span#buzzerTestMessage").hide();
        this.presentationInstance.showSlideJeopardyLogo(); //i guess
    }

    skipClue() {
        // TODO probably need more rigorous checks here
        if (this.isATeamAnswering) {
            return;
        }

        this.buttonSkipClue.blur();
        this.currentCountdownTimer && this.currentCountdownTimer.reset();
        this.getClue();

    }

    saveTeamNames() {
        var inputTeamNames = new Array(NUM_TEAMS);
        for (var i = 0; i < NUM_TEAMS; i++) {
            inputTeamNames[i] = $("input#teamName" + i);
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
            var newTeam = this.teamArray[i] = new Team(i);
            newTeam.setDivOperator($('div[data-team-number="' + i + '"]'));
            newTeam.setDivPresentation(this.presentationInstance.getTeamDiv(i));
        }
        this.saveTeamNames();
    }

    handleBuzzerPress(teamIdx) {
        const teamObj = this.teamArray[teamIdx];
        if (this.buzzerTest) {
            teamObj.buzzerTestShow();
        } else {

            if (this.isPaused) {
                return;
            }

            if (this.isClueQuestionBeingRead || (this.isATeamAnswering && this.answeringTeam !== teamObj)) {

                if (!teamObj.isLockedOut) {

                    // do lockout
                    teamObj.setLockout(true);

                    teamObj.operatorProgress.addClass("lockout");

                    var countdownLockout = new CountdownTimer(SETTINGS.lockoutDuration);
                    countdownLockout.progressElement = teamObj.operatorProgress;
                    countdownLockout.onFinished = endLockout;
//                countdownLockout.onPause = () => this.pause();
//                countdownLockout.onResume = () => this.resume();
                    countdownLockout.start();

                    return;

                    function endLockout() {
                        teamObj.setLockout(false);
                        teamObj.operatorProgress.removeClass("lockout");
                    }

                }
            }


            if (!teamObj.hasAnswered || (teamObj.hasAnswered && SETTINGS.isAllowedMultipleTries)) {

                if (teamObj.isBuzzerOpen) {

                    this.audioTeamBuzz.play();

                    this.answeringTeam = teamObj;

                    this.isATeamAnswering = true;
                    teamObj.setIsAnswering(true);

                    this.countdownQuestionTimeout.pause();

                    this.divInstructions.html("Did they answer correctly? y / n");


                    var countdownAnswer = this.currentCountdownTimer = new CountdownTimer(SETTINGS.answerTimeout);
                    countdownAnswer.progressElement = teamObj.operatorProgress;
                    countdownAnswer.dotsElement = teamObj.presentationCountdownDots;
                    countdownAnswer.onFinished = () => this.handleAnswerTimeout(teamObj);
                    countdownAnswer.onPause = () => this.pause();
                    countdownAnswer.onResume = () => this.resume();
                    countdownAnswer.start();

                }
            }
        }

    }

    handleBuzzerRelease(teamIdx) {
        if (this.buzzerTest) {
            const teamObj = this.teamArray[teamIdx];
            teamObj.buzzerTestHide();
        }
    }

    handleAnswerTimeout(teamObj) {
        teamObj.moneySubtract(this.currentClueObj.value);
        teamObj.setIsAnswering(false);
        this.audioAnswerIncorrect.play();

        this.currentCountdownTimer.reset(); //countdown for that team's answer
        this.isATeamAnswering = false;
        this.divInstructions.html("Wait for people to answer");
        this.countdownQuestionTimeout.resume();
        this.currentCountdownTimer = this.countdownQuestionTimeout;

        teamObj.setBuzzerOpen(SETTINGS.isAllowedMultipleTries);
    }

    getClue() {
        return new Promise((resolve, reject) => {
            this.buttonStartGame.blur();
            this.trQuestion.hide();
            this.divInstructions.html("Loading clue...");
            //        this.setAllBuzzersIsOpen(false);

            $.getJSON("http://jservice.io/api/random", response => {
                const clueObj = response[0];
                this.currentClueObj = clueObj;
                
                this.divClueWrapper.show();
                this.divClueCategory.html(clueObj.category.title);
                this.divClueDollars.html("$" + clueObj.value);
                this.trAnswer.hide();
                this.presentationInstance.setClueObj(clueObj);
//                this.presentationInstance.showSlidePreQuestion();
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



    showClueQuestion(clueObj) {
        this.currentCountdownTimer = null;
        this.presentationInstance.showSlideClueQuestion();


        this.divInstructions.html("Read aloud the question. Buzzers open when you press space");

        this.divClueQuestion.html(getClueQuestionHtml(clueObj));
        this.trQuestion.show();
        this.trAnswer.hide();

        this.isClueQuestionBeingRead = true;
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

    handleDoneReadingClueQuestion() {
        //called from keydown on spacebar
        if (!this.isClueQuestionBeingRead) {
            return;
        }
        this.isClueQuestionBeingRead = false;
        this.isClueQuestionAnswerable = true;
        this.setAllBuzzersIsOpen(true);

        this.trAnswer.show();
        this.divClueAnswer.html(this.currentClueObj.answer);
        this.divInstructions.html("Wait for people to answer");

        var countdownQuestionTimeout = this.currentCountdownTimer = new CountdownTimer(SETTINGS.questionTimeout);
        countdownQuestionTimeout.progressElement = this.progressPrimary;
        countdownQuestionTimeout.onFinished = () => this.handleQuestionTimeout();
        countdownQuestionTimeout.onPause = () => !this.isATeamAnswering && this.pause();
        countdownQuestionTimeout.onResume = () => !this.isATeamAnswering && this.resume();
        countdownQuestionTimeout.start();

        // so we can pause the timeout when a team is answering. TODO find a better way
        this.countdownQuestionTimeout = countdownQuestionTimeout;

    }

    handleQuestionTimeout() {
        this.divInstructions.html("Question timed out.");
        this.audioQuestionTimeout.play();
        this.setAllBuzzersIsOpen(false);
        this.isClueQuestionAnswerable = false;
        this.currentCountdownTimer = null;


        // wait for timeout sound to play
        window.setTimeout(() => {
            this.presentationInstance.showSlideClueAnswer();

            var countdownNextClue = this.currentCountdownTimer = new CountdownTimer(SETTINGS.displayDurationAnswer);
            countdownNextClue.progressElement = this.progressPrimary;
            countdownNextClue.onFinished = () => this.getClue();
            countdownNextClue.onPause = () => this.pause();
            countdownNextClue.onResume = () => this.resume();
            countdownNextClue.start();
        }, 1000);
    }

    setAllBuzzersIsOpen(isOpen) {
        this.teamArray.forEach(team => {
            if (!team.isLockedOut) {
                team.setBuzzerOpen(isOpen);
            }
            team.hasAnswered = false;

        });
    }

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