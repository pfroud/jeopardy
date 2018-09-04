/* global SETTINGS */

const NUM_TEAMS = 4;

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

        this.progressPrimary = $("progress#primary");

        this.divInstructions = $("div#instructions");

        this.currentClueObj = null;
        this.currentCountdownTimer = null;

        this.teamArray = new Array(NUM_TEAMS);

        // TODO remove these booleans and use a state machine
        this.hasInitializedTeams = false;
        this.isClueQuestionAnswerable = false;
        this.isClueQuestionBeingRead = false;
        this.isPaused = false;
        this.isATeamAnswering = false;


        this.initKeyboardListeners();
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
                    const teamIdx = Number(event.key) - 1; //team zero buzzes by pressing one key
                    this.handleBuzzerPress(teamIdx);
                    break;

                case "p":
                    this.currentCountdownTimer && this.currentCountdownTimer.togglePaused();
                    break;
                case " ": //space
                    this.handleDoneReadingClueQuestion();
                    break;
            }
        });
    }

    initMouseListeners() {
        $("button#logClueToConsole").click(() => {
            console.log(this.currentClueObj);
        });

//        $("button#showRules").click(() => {
//            console.warn("show rules button not implemented");
//            this.windowPresentation.showRules();
//        });

        this.buttonShowClue = $("button#showClue").click(() => {
            this.getClue();
        });

        var inputTeamNames = new Array(NUM_TEAMS);
        for (var i = 0; i < NUM_TEAMS; i++) {
            inputTeamNames[i] = $("input#teamName" + i);
        }
        $("button#saveTeamNames").click(() => {
            for (var i = 0; i < NUM_TEAMS; i++) {
                this.teamArray[i].setTeamName(inputTeamNames[i].prop("value"));
            }

            this.presentationInstance.setTeamsVisible(true);
        });
    }

    handlePresentationReady(presentationInstance) {
        // called from Presentation instance in other window
        this.presentationInstance = presentationInstance;
        this.initTeams();
    }

    initTeams() {
        if (!this.presentationInstance) {
            console.warn("can't init teams because no Presentation instance");
            return;
        }

        for (var i = 0; i < NUM_TEAMS; i++) {
            var newTeam = this.teamArray[i] = new Team(i);
            newTeam.setDivOperator($('div[data-team-number="' + i + '"]'));
            newTeam.setDivPresentation(this.presentationInstance.getTeamDiv(i));
        }
        this.hasInitializedTeams = true;
        this.buttonShowClue.prop("disabled", false);
        this.divInstructions.html("click button to fetch a clue.");
    }

    handleBuzzerPress(teamIdx) {
        if (!this.isClueQuestionAnswerable || this.isPaused || this.isATeamAnswering) {
            return;
        }

        var teamObj = this.teamArray[teamIdx];

        if (!teamObj.hasAnswered || (teamObj.hasAnswered && SETTINGS.isAllowedMultipleTries)) {

            if (teamObj.isBuzzerOpen) {
                this.isATeamAnswering = true;
                teamObj.setIsAnswering(true);

                this.divInstructions.html("did they answer correctly? y / n");
                // TODO add keyboard listeners for Y and N


                var countdownAnswer = this.currentCountdownTimer = new CountdownTimer(SETTINGS.answerTimeout);
                countdownAnswer.progressElement = teamObj.operatorProgress;
                countdownAnswer.dotsElement = teamObj.presentationCountdownDots;
                countdownAnswer.onFinished = () => this.handleAnswerTimeout(teamObj);
//                countdownAnswer.onPause = () => this.setPausedVisible(true);
//                countdownAnswer.onResume = () => this.setPausedVisible(false);
                countdownAnswer.start();

            }
        }
    }

    handleAnswerTimeout(teamObj) {
        teamObj.setIsAnswering(false);
        this.isATeamAnswering = false;
        this.divInstructions.html("wait for people to answer.");
    }

    getClue() {
        if (!this.hasInitializedTeams) {
            console.warn("can't get clue because teams not initailzied");
            return;
        }

        this.buttonShowClue.blur();
        this.trQuestion.css("display", "none");
        this.divInstructions.html("Loading clue...");

        this.presentationInstance.showSlideSpinner();

        this.setAllBuzzersIsOpen(false);

        $.getJSON("http://jservice.io/api/random", response => {
            if (response.length < 1) {
                console.warn("respones from jservice.io is empty");
                return;
            }

            var clueObj = response[0];

            if (!isClueValid(clueObj)) {
                console.warn("clue is messed up");
                return;
            }

            this.currentClueObj = clueObj;

            this.divClueWrapper.css("display", "");
            this.divClueCategory.html(clueObj.category.title);
            this.divClueDollars.html("$" + clueObj.value);
            this.trAnswer.css("display", "none");



            this.presentationInstance.setClueObj(clueObj);
            this.presentationInstance.showSlidePreQuestion();

            this.divInstructions.html("read aloud the category and dollar value.");

            var countdownShowCategory = this.currentCountdownTimer = new CountdownTimer(SETTINGS.displayDurationCategory);
            countdownShowCategory.progressElement = this.progressPrimary;
            countdownShowCategory.onFinished = () => this.showClueQuestion(clueObj);
            countdownShowCategory.onPause = () => this.setPausedVisible(true);
            countdownShowCategory.onResume = () => this.setPausedVisible(false);
            countdownShowCategory.start();

            function isClueValid(clueObj) {
                return clueObj.value !== null &&
                        clueObj.question.length > 0 &&
                        clueObj.answer.length > 0 &&
                        clueObj.category !== null &&
                        clueObj.category.title.length > 0
                        ;
            }
        });
    }

    showClueQuestion(clueObj) {

        this.currentCountdownTimer = null;
        this.presentationInstance.showSlideClueQuestion();


        this.divInstructions.html("read aloud the clue. buzzers open when you press space.");

        this.divClueQuestion.html(getClueQuestionHtml(clueObj));
        this.trQuestion.css("display", "");
        this.trAnswer.css("display", "none");

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

        this.trAnswer.css("display", "");
        this.divClueAnswer.html(this.currentClueObj.answer);
        this.divInstructions.html("wait for people to answer.");

        var countdownQuestionTimeout = this.currentCountdownTimer = new CountdownTimer(SETTINGS.questionTimeout);
        countdownQuestionTimeout.progressElement = this.progressPrimary;
        countdownQuestionTimeout.onFinished = () => this.handleQuestionTimeout();
        countdownQuestionTimeout.onPause = () => this.setPausedVisible(true);
        countdownQuestionTimeout.onResume = () => this.setPausedVisible(false);
        countdownQuestionTimeout.start();

    }

    handleQuestionTimeout() {
        this.divInstructions.html("question timed out.");
        this.setAllBuzzersIsOpen(false);
        this.isClueQuestionAnswerable = false;
        this.currentCountdownTimer = null;
        this.presentationInstance.showSlideClueAnswer();


        var countdownNextClue = this.currentCountdownTimer = new CountdownTimer(SETTINGS.displayDurationAnswer);
        countdownNextClue.progressElement = this.progressPrimary;
        countdownNextClue.onFinished = () => this.getClue();
        countdownNextClue.onPause = () => this.setPausedVisible(true);
        countdownNextClue.onResume = () => this.setPausedVisible(false);
        countdownNextClue.start();
    }

    setAllBuzzersIsOpen(isOpen) {
        this.teamArray.forEach(team => team.setBuzzerOpen(isOpen));
    }

    setPaused(isPaused) {
        this.isPaused = isPaused;
        this.divPaused.css("display", isPaused ? "" : "none");
        this.presentationInstance.setPaused(isPaused);
    }

}