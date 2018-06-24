
var windowDisplay, divClueQuestion, divClueDollars, divClueCategory, divClueAirdate;
var teamArray = new Array(4);

const SETTINGS = new Settings();

$(document).ready(function () {

//    var timer = new CountdownTimer(5000);
//    var textElement = timer.textElement = $("div#countdown-text");
//    timer.onFinished = () => textElement.css("color", "red");

    $("button#openDisplayWindow").on("click", function () {
        windowDisplay = window.open("../display/index.html", "windowDisplay");
    });

    $("button#init").on("click", function () {
        initTeams();
    });

    $("button#showClue").on("click", function () {
        getClue();
    });

    divClueQuestion = $("div#clue-question");
    divClueCategory = $("div#clue-category");
    divClueDollars = $("div#clue-dollars");
    divClueAirdate = $("div#clue-airdate");

//    initTeams();

});

function initTeams() {

    if (!windowDisplay) {
        console.warn("can't init, no display window");
        return;
    }

    for (var i = 0; i < 4; i++) {
        var team = teamArray[i] = new Team(i);
//        team.setDisplayDiv(windowDisplay.getTeamDiv(i));
        var divOperator = $('div[data-team-number="' + i + '"]');
        team.setOperatorDiv(divOperator);
        team.setTeamName("team " + i);
    }
    setTeamDisplayDivs();
}

function setTeamDisplayDivs() {
    for (var i = 0; i < 4; i++) {
        teamArray[i].setDisplayDiv(windowDisplay.getTeamDiv(i));
    }
}


function getClue() {

    windowDisplay.setVisibleJeopardyLogo(false);
    windowDisplay.setVisibleSpinner(true);

    $.getJSON("http://jservice.io/api/random", function (response) {

        windowDisplay.setVisibleSpinner(false);

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

        divClueQuestion.html(html);
        divClueCategory.html(clueObj.category.title);
        divClueAirdate.html(clueObj.airdate);
        divClueDollars.html("$" + clueObj.value);


        /////////////
        windowDisplay.showCategoryAndDollars(clueObj);

        var countdown = new CountdownTimer(SETTINGS.displayDurationCategoryBeforeQuestion);
        countdown.progressElement = $("progress");
        countdown.onFinished = () => windowDisplay.showClue(clueObj);
        countdown.start();




    });

}

function save() {
    // todo - make a Game object instead of global fns...
}