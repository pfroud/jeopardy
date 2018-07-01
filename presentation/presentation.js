
//rename this to 'presentation'
var divQuestion, divCategoryInHeader, divDollarsInHeader,
        spinner, imgLogoJeopardy, footerTeams, divCategoryBig,
        divDollarsBig, divPreQuestion, divClueAnswer;
$(document).ready(function () {
    divQuestion = $("div#clue");

    divCategoryInHeader = $("header div#category");
    divDollarsInHeader = $("header div#dollars");
    divCategoryBig = $("div#category-big");
    divDollarsBig = $("div#dollars-big");
    divPreQuestion = $("div#pre-question");
    divClueAnswer = $("div#clue-answer");

    imgLogoJeopardy = $("img#logo-jeopardy");
    fooerTeams = $("footer");
    spinner = $("div#spinner");

    if (window.opener) {
        window.opener.handleDisplayWindowReady();
    } else {
        console.warn("no window.opener");
    }
});

function setVisibleSpinner(isVisible) {
    spinner.css("display", isVisible ? "" : "none");
    return this;
}

function setVisibleJeopardyLogo(isVisible) {
    imgLogoJeopardy.css("display", isVisible ? "" : "none");
    return this;
}

function setVisibleTeams(isVisible) {
    footerTeams.css("display", isVisible ? "" : "none");
    return this;
}

function setVisibleClueAnswer(isVisible) {
    divClueAnswer.css("display", isVisible ? "" : "none");
    return this;
}

function showCategoryAndDollars(clueObj) {
    divQuestion.css("display", "none");
    divCategoryInHeader.css("display", "none");
    divDollarsInHeader.css("display", "none");

    divPreQuestion.css("display", "");
    divCategoryBig.html(clueObj.category.title);
    divDollarsBig.html("$" + clueObj.value);
}


function showClue(clueObj) {
    divPreQuestion.css("display", "none");
    divQuestion.css("display", "").html(clueObj.question);
    divCategoryInHeader.css("display", "").html(clueObj.category.title);
    divDollarsInHeader.css("display", "").html("$" + clueObj.value);

}

function getTeamDiv(teamNumber) {
    return $('div[data-team-number="' + teamNumber + '"]');
}

function showTimeoutMessage(clueObj) {
    divQuestion.css("display", "none");
    divClueAnswer.css("display", "").html("Answer:<p><div style=\"font-weight:bold\">"
            + clueObj.answer + "</div>");

}