/* global SETTINGS */

class Operator {

    constructor() {


        this.windowPresentation = null;
        this.divClueWrapper = $("div#clue");
        this.divClueQuestion = $("div#clue-question");
        this.divClueDollars = $("div#clue-dollars");
        this.divClueCategory = $("div#clue-category");
        this.divClueAirdate = $("div#clue-airdate");

        this.progressPrimary = $("progress#primary");

        this.divInstructions = $("div#instructions");


        this.teamArray = new Array(4);
        this.hasInitializedTeams = false;

        this.isClueQuestionVisible = false;
        this.isClueQuestionBeingRead = false;

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
        $("button#openDisplayWindow").on("click", () => {
            this.windowPresentation = window.open("../presentation/presentation.html", "windowPresentation");
        });

        this.buttonShowClue = $("button#showClue").on("click", () => {
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
        if (!this.isClueQuestionVisible) {
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

        this.windowPresentation
                .setVisibleJeopardyLogo(false)
                .setVisibleSpinner(true);

        this.setAllBuzzersIsOpen(false);

        $.getJSON("http://jservice.io/api/random", response => {

            this.windowPresentation.setVisibleSpinner(false);

            if (response.length < 1) {
                console.warn("respones from jservice.io is empty");
                return;
            }

            var clueObj = response[0];

            this.divClueCategory.html("Category: " + clueObj.category.title);
            this.divClueDollars.html("Value: $" + clueObj.value);
            this.divClueAirdate.html("Airdate: " + clueObj.airdate);

            this.windowPresentation.showCategoryAndDollars(clueObj);

            this.divInstructions.html("read aloud the category and dollar value.");

            var countdownShowCategory = new CountdownTimer(SETTINGS.displayDurationCategory);
            countdownShowCategory.progressElement = this.progressPrimary;
            countdownShowCategory.onFinished = () => this.showClueQuestion(clueObj);
            countdownShowCategory.start();
        });



    }

    showClueQuestion(clueObj) {

        this.windowPresentation.showClue(clueObj);

        this.divInstructions.html("read aloud the clue. buzzers open when you press space.");

        this.divClueQuestion.html("Question: " + getClueQuestionHtml(clueObj));
        
        this.isClueQuestionBeingRead = true;


//        var countdown = this.presentCountdownTimer = new CountdownTimer(5000);
//        countdown.progressElement = $("progress");
//        countdown.onFinished = () => this.handleQuestionTimeout(clueObj);
//        countdown.start();
//        this.isClueQuestionVisible = true;

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
        this.setAllBuzzersIsOpen(true);
    }

    handleQuestionTimeout(clueObj) {
        // probably display something
        console.log("question timed out");
        this.isClueQuestionVisible = false;
        this.countdownQuestion = null;
    }

    setAllBuzzersIsOpen(isOpen) {
        this.teamArray.forEach(team => team.setBuzzerOpen(isOpen));
    }

}