/* global SETTINGS */

class Operator {

    constructor() {
        this.windowPresentation = null;
        this.divClueWrapper = $("div#clue");
        this.divClueQuestion = $("div#clue-question");
        this.divClueDollars = $("div#clue-dollars");
        this.divClueCategory = $("div#clue-category");
//        this.divClueAirdate = $("div#clue-airdate");
        this.trQuestion = $("tr#question");
        this.divPaused = $("div#paused");

        this.progressPrimary = $("progress#primary");

        this.divInstructions = $("div#instructions");

        this.presentClueObj = null;


        this.teamArray = new Array(4);
        this.hasInitializedTeams = false;

        this.isClueQuestionAnswerable = false;
        this.isClueQuestionBeingRead = false;
        this.isPaused = false;

        this.isATeamAnswering = false;


        this.presentCountdownTimer = null;

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
                    this.handleBuzzerPress(Number(event.key) - 1);
                    break;

                case "p":
                    this.presentCountdownTimer && this.presentCountdownTimer.togglePaused();
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
        if (!this.isClueQuestionAnswerable || this.isPaused) {
            return;
        }

        var teamObj = this.teamArray[teamIdx];
        if (!teamObj.hasAnswered || (teamObj.hasAnswered && SETTINGS.isAllowedMultipleTries)) {
            teamObj.displayBuzz();
        }
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

            this.divClueWrapper.css("display", "");
            this.divClueCategory.html(clueObj.category.title);
            this.divClueDollars.html("$" + clueObj.value);
//            this.divClueAirdate.html("Airdate: " + clueObj.airdate);

            this.windowPresentation.showCategoryAndDollars(clueObj);

            this.divInstructions.html("read aloud the category and dollar value.");

            var countdownShowCategory = this.presentCountdownTimer = new CountdownTimer(SETTINGS.displayDurationCategory);
            countdownShowCategory.progressElement = this.progressPrimary;
            countdownShowCategory.onFinished = () => this.showClueQuestion(clueObj);
            countdownShowCategory.onPause = () => this.setPausedVisible(true);
            countdownShowCategory.onResume = () => this.setPausedVisible(false);
            countdownShowCategory.start();
        });



    }

    showClueQuestion(clueObj) {

        this.presentCountdownTimer = null;
        this.windowPresentation.showClue(clueObj);
        this.presentClueObj = clueObj;

        this.divInstructions.html("read aloud the clue. buzzers open when you press space.");

        this.divClueQuestion.html(getClueQuestionHtml(clueObj));
        this.trQuestion.css("display", "");

        this.isClueQuestionBeingRead = true;
        // then wait for spacebar to be pressed

        function getClueQuestionHtml(clueObj) {
            var clueStr = clueObj.question;

            var regex = /(?:this)|(?:these)|(?:her)|(?:his)/i;
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
        if (!this.isClueQuestionBeingRead) {
            return;
        }
        this.isClueQuestionBeingRead = false;
        this.isClueQuestionAnswerable = true;
        this.setAllBuzzersIsOpen(true);

        this.divInstructions.html("wait for people to answer.");

        var countdownQuestionTimeout = this.presentCountdownTimer = new CountdownTimer(SETTINGS.questionTimeout);
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
        this.presentCountdownTimer = null;
        this.windowPresentation.showTimeoutMessage(this.presentClueObj);


        var countdownNextClue = this.presentCountdownTimer = new CountdownTimer(SETTINGS.displayDurationAnswer);
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