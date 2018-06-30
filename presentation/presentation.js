
//rename this to 'presentation'
var divClue, divCategoryHeader, divDollarsHeader,
        spinner, imgLogoJeopardy, footerTeams, divCategoryBig,
        divDollarsBig, divPreQuestion;
$(document).ready(function () {
    divClue = $("div#clue");

    divCategoryHeader = $("header div#category");
    divDollarsHeader = $("header div#dollars");
    divCategoryBig = $("div#category-big");
    divDollarsBig = $("div#dollars-big");
    divPreQuestion = $("div#pre-question");

    imgLogoJeopardy = $("img#logo-jeopardy");
    fooerTeams = $("footer");
    spinner = $("div#spinner");
    
    window.opener.handleDisplayWindowReady();
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

function showCategoryAndDollars(clueObj) {
    divClue.css("display", "none");
    divCategoryHeader.css("display", "none");
    divDollarsHeader.css("display", "none");
    
    divPreQuestion.css("display", "");
    divCategoryBig.html(clueObj.category.title);
    divDollarsBig.html("$" + clueObj.value);
}


function showClue(clueObj) {
    divPreQuestion.css("display", "none");
    divClue.css("display","").html(clueObj.question);
    divCategoryHeader.css("display","").html(clueObj.category.title);
    divDollarsHeader.css("display","").html("$" + clueObj.value);

}

function getTeamDiv(teamNumber) {
    return $('div[data-team-number="' + teamNumber + '"]');
}