// https://stackoverflow.com/questions/7012364/jquery-show-only-one-div-at-any-time

class Presentation {

    constructor() {
        this.divCategoryInHeader = $("header div#category");
        this.divDollarsInHeader = $("header div#dollars");

        this.divPaused = $("div#paused");

        this.footerTeams = $("footer");

        this.allSlides = $("div.slide");

        this.currentClueObj = null;


        // automatically initiate slides
        this.slides = {};
        ["jeopardyLogo", "gameRules", "spinner", "preQuestion", "clueQuestion",
            "clueAnswer", "eventCostChart"].forEach(slideName => {
            var slideNameCap = capitalizeFirstLetter(slideName);
            this.slides[slideName] = $("div#slide" + slideNameCap);

            // https://stackoverflow.com/a/32498473
            this["showSlide" + slideNameCap] = function () {
                this.showSlide(slideName);
            };
        });

        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.substring(1);
        }

        /*
         this.divCategoryBig = $("div#category-big");
         this.divDollarsBig = $("div#dollars-big");
         this.divPreQuestion = $("div#pre-question");
         this.divClueAnswer = $("div#clue-answer");
         this.divQuestion = $("div#clue");
         
         this.imgLogoJeopardy = $("img#logo-jeopardy");
         this.imgLogoJeopardyShadow = $("img#logo-jeopardy-shadow");
         
         this.spinner = $("div#spinner");
         */


        if (window.opener) {
            //calls function in mainOperator.js not Operator.js
            window.opener.operatorInstance.handlePresentationReady(this);
        } else {
            console.warn("no window.opener");
        }
    }

    setVisibleTeams(isVisible) {
        this.footerTeams.css("display", isVisible ? "" : "none");
    }

    showSlide(slideName) {
        this.allSlides.hide();
        this.slides[slideName].show();
    }

    setClueObj(clueObj) {
        this.divCategoryInHeader.html(clueObj.category.title);
        this.divDollarsInHeader.html("$" + clueObj.value);

        this.divCategoryBig.html(clueObj.category.title);
        this.divDollarsBig.html("$" + clueObj.value);

        this.divQuestion.html(clueObj.question);
    }

/*
    showCategoryAndDollars(clueObj) {
        this.divQuestion.css("display", "none");
        this.divCategoryInHeader.css("display", "none");
        this.divDollarsInHeader.css("display", "none");
        this.divPreQuestion.css("display", "");
        this.divCategoryBig.html(clueObj.category.title);
        this.divDollarsBig.html("$" + clueObj.value);
    }

    showClue(clueObj) {
        this.divPreQuestion.css("display", "none");
        this.divQuestion.css("display", "").html(clueObj.question);
        this.divCategoryInHeader.css("display", "").html(clueObj.category.title);
        this.divDollarsInHeader.css("display", "").html("$" + clueObj.value);
    }
    */

    getTeamDiv(teamNumber) {
        return $('div[data-team-number="' + teamNumber + '"]');
    }

    showTimeoutMessage(clueObj) {
        // TODO maybe make this a slide
        this.divQuestion.css("display", "none");
        this.divClueAnswer.css("display", "").html(
                "Answer:<p><div style=\"font-weight:bold\">"
                + clueObj.answer + "</div>");

    }

    setPausedVisible(isVisible) {
        this.divPaused.css("display", isVisible ? "" : "none");
    }
}
