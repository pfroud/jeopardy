$(document).ready(function () {
    new Presentation();
});

// https://stackoverflow.com/questions/7012364/jquery-show-only-one-div-at-any-time

class Presentation {

    constructor() {

        this.divQuestion = $("div#clue");

        this.divCategoryInHeader = $("header div#category");
        this.divDollarsInHeader = $("header div#dollars");
        this.divCategoryBig = $("div#category-big");
        this.divDollarsBig = $("div#dollars-big");
        this.divPreQuestion = $("div#pre-question");
        this.divClueAnswer = $("div#clue-answer");
        this.divPaused = $("div#paused");

        this.imgLogoJeopardy = $("img#logo-jeopardy");
        this.imgLogoJeopardyShadow = $("img#logo-jeopardy-shadow");
        this.footerTeams = $("footer");
        this.spinner = $("div#spinner");

        if (window.opener) {
            window.opener.handleDisplayWindowReady(this);
        } else {
            console.warn("no window.opener");
        }
    }

    setVisibleSpinner(isVisible) {
        this.spinner.css("display", isVisible ? "" : "none");
        return this;
    }

    setVisibleJeopardyLogo(isVisible) {
        this.imgLogoJeopardy.css("display", isVisible ? "" : "none");
        this.imgLogoJeopardyShadow.css("display", isVisible ? "" : "none");
        return this;
    }

    setVisibleTeams(isVisible) {
        this.footerTeams.css("display", isVisible ? "" : "none");
        return this;
    }

    setVisibleClueAnswer(isVisible) {
        this.divClueAnswer.css("display", isVisible ? "" : "none");
        return this;
    }

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

    getTeamDiv(teamNumber) {
        return $('div[data-team-number="' + teamNumber + '"]');
    }

    showTimeoutMessage(clueObj) {
        this.divQuestion.css("display", "none");
        this.divClueAnswer.css("display", "").html(
                "Answer:<p><div style=\"font-weight:bold\">"
                + clueObj.answer + "</div>");

    }

    setPausedVisible(isVisible) {
        this.divPaused.css("display", isVisible ? "" : "none");
    }
}
