/* global SETTINGS */

class Operator {

    constructor() {


        this.windowPresentation = null;
        this.divClueQuestion = $("div#clue-question");
        this.divClueDollars = $("div#clue-dollars");
        this.divClueCategory = $("div#clue-category");
        this.divClueAirdate = $("div#clue-airdate");


        this.teamArray = new Array(4);
        this.isQuestionActive = false;
        this.hasInitializedTeams = false;

        this.countdownQuestion = null;

        this.initKeyboardListeners();
        this.initMouseListeners();



    }

    initKeyboardListeners() {
        window.addEventListener("keydown", function (event) {
            switch (event.key) {
                case "1":
                case "2":
                case "3":
                case "4":
                    this.handleBuzzerPress(Number(event.key) - 1);
                    break;
            }
        });
    }

    initMouseListeners() {
        $("button#openDisplayWindow").on("click", () => {
            this.windowPresentation = window.open("../presentation/presentation.html", "windowPresentation");
        });

        $("button#showClue").on("click", () => {
            this.getClue();
        });
    }

    handleBuzzerPress(teamNumber) {
        if (!isQuestionActive) {
            return;
        }

        var teamObj = this.teamArray[teamNumber];

        if (teamObj.hasAnswered) {

            if (SETTINGS.isAllowedMultipleTries) {
                doBuzz();
            } else {
                // do nothing, the team already answered and settings only allow one attempt
            }

        } else {
            doBuzz(teamObj);
        }
    }

    doBuzz(teamObj) {
        teamObj.displayBuzz();

//        var countdown = new CountdownTimer(5000);

    }

    initTeams() {
        if (!this.windowPresentation) {
            console.warn("can't init, no presentation window");
            return;
        }

        for (var i = 0; i < 4; i++) {
            var team = this.teamArray[i] = new Team(i);
//        team.setDisplayDiv(windowDisplay.getTeamDiv(i));
            var divOperator = $('div[data-team-number="' + i + '"]');
            team.setOperatorDiv(divOperator);
            team.setTeamName("team " + i);
        }
        this.setTeamDisplayDivs();

        this.hasInitializedTeams = true;
    }

    setTeamDisplayDivs() {
        for (var i = 0; i < 4; i++) {
            this.teamArray[i].setDisplayDiv(this.windowPresentation.getTeamDiv(i));
        }
    }

    getClue() {
        if (!this.hasInitializedTeams) {
            console.warn("can't get clue, need to initialie teams first");
            return;
        }

        this.windowPresentation.setVisibleJeopardyLogo(false);
        this.windowPresentation.setVisibleSpinner(true);

        $.getJSON("http://jservice.io/api/random", response => {

            this.windowPresentation.setVisibleSpinner(false);

            if (response.length < 1) {
                console.warn("respones from jservice.io is empty??!");
            }

            var clueObj = response[0];


            var clueStr = clueObj.question;

            var regex = /(?:this)|(?:these)|(?:her)|(?:his)/i;
            var result = regex.exec(clueStr);

            var html;
            if (result === null) {
                html = clueStr;
            } else {
                var startIndex = result.index;
                var foundWord = result[0];

                html = clueStr.substring(0, startIndex) + '<span class="clue-keyword">' +
                        foundWord + '</span>' + clueStr.substring(startIndex + foundWord.length);
            }

            this.divClueQuestion.html(html);
            this.divClueCategory.html(clueObj.category.title);
            this.divClueAirdate.html(clueObj.airdate);
            this.divClueDollars.html("$" + clueObj.value);


            /////////////
            this.windowPresentation.showCategoryAndDollars(clueObj);

            var countdown = new CountdownTimer(SETTINGS.displayDurationCategoryBeforeQuestion);
            countdown.progressElement = $("progress");
            countdown.onFinished = () => this.showClueQuestion(clueObj);
            countdown.start();




        });

    }

    showClueQuestion(clueObj) {

        this.windowPresentation.showClue(clueObj);

        var countdown = this.countdownQuestion = new CountdownTimer(5000);
        countdown.progressElement = $("progress");
        countdown.onFinished = () => this.handleQuestionTimeout(clueObj);
        countdown.start();
        this.isQuestionActive = true;

    }

    handleQuestionTimeout(clueObj) {
        // probably display something
        console.log("question timed out");
        this.isQuestionActive = false;
        this.countdownQuestion = null;
    }

}