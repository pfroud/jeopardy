/* global SETTINGS */

class Operator {

    constructor() {
        this.windowPresentation = window.open("../presentation/presentation.html", "windowPresentation");
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


        this.teamArray = new Array(4);
        this.hasInitializedTeams = false;

        this.isClueQuestionAnswerable = false;
        this.isClueQuestionBeingRead = false;
        this.isPaused = false;

        this.isATeamAnswering = false;


        this.currentCountdownTimer = null;

        this.initKeyboardListeners();
        this.initMouseListeners();
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
        $("button#openDisplayWindow").click(() => {
            this.windowPresentation = window.open("../presentation/presentation.html", "windowPresentation");
        });


        $("button#logClueToConsole").click(() => {
            console.log(this.currentClueObj);
        });

        this.buttonShowClue = $("button#showClue").click(() => {
            this.getClue();
        });
    }

    initTeams() {
        if (!this.windowPresentation) {
            console.warn("can't init teams because no presentation window");
            return;
        }

        for (var i = 0; i < 4; i++) {
            var t = this.teamArray[i] = new Team(i);
            t.setDivOperator($('div[data-team-number="' + i + '"]'));
            t.setDivPresentation(this.windowPresentation.getTeamDiv(i));
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

        this.windowPresentation
                .setVisibleJeopardyLogo(false)
                .setVisibleSpinner(true)
                .setVisibleClueAnswer(false);

        this.setAllBuzzersIsOpen(false);

        $.getJSON("http://jservice.io/api/random", response => {
            this.windowPresentation.setVisibleSpinner(false);

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
//            this.divClueAirdate.html("Airdate: " + clueObj.airdate);

            this.windowPresentation.showCategoryAndDollars(clueObj);

            this.divInstructions.html("read aloud the category and dollar value.");

            var countdownShowCategory = this.currentCountdownTimer = new CountdownTimer(SETTINGS.displayDurationCategory);
            countdownShowCategory.progressElement = this.progressPrimary;
            countdownShowCategory.onFinished = () => this.showClueQuestion(clueObj);
            countdownShowCategory.onPause = () => this.setPausedVisible(true);
            countdownShowCategory.onResume = () => this.setPausedVisible(false);
            countdownShowCategory.start();
        });

        function isClueValid(clueObj) {
            return clueObj.value !== null &&
                    clueObj.question.length > 0 &&
                    clueObj.answer.length > 0 &&
                    clueObj.category !== null &&
                    clueObj.category.title.length > 0
                    ;
        }

    }

    showClueQuestion(clueObj) {

        this.currentCountdownTimer = null;
        this.windowPresentation.showClue(clueObj);


        this.divInstructions.html("read aloud the clue. buzzers open when you press space.");

        this.divClueQuestion.html(getClueQuestionHtml(clueObj));
        this.trQuestion.css("display", "");
        this.trAnswer.css("display", "none");

        this.isClueQuestionBeingRead = true;
        // then wait for spacebar to be pressed

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
        this.windowPresentation.showTimeoutMessage(this.currentClueObj);


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

    setIsPaused(isPaused) {
        this.isPaused = isPaused;
        this.divPaused.css("display", isPaused ? "" : "none");
        this.windowPresentation.setPausedVisible(isPaused);
    }

}