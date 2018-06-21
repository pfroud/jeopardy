
var divClue, divCategory, divDollars, spinner, imgLogoJeopardy;
$(document).ready(function () {
//    return;
    divClue = $("div#clue");
    divCategory = $("div#category");
    divDollars = $("div#dollars");
    imgLogoJeopardy = $("img#logo-jeopardy");

    spinner = $("div#spinner");




});

function showClue() {

    divClue.html("");
    divCategory.html("");
    divDollars.html("");
    
    imgLogoJeopardy.css("display", "none");
    spinner.css("display", "");
    $.getJSON("http://jservice.io/api/random", function (data) {

        spinner.css("display", "none");

        var obj = data[0];

        /*
         var regex = /(?:this)|(?:these)/i;
         var result = regex.exec(clueStr);
         
         var html;
         if (result === null) {
         html = clueStr;
         } else {
         var startIndex = result.index;
         var foundWord = result[0];
         
         html = clueStr.substring(0, startIndex) + '<span class="this">' +
         foundWord + '</span>' + clueStr.substring(startIndex + foundWord.length);
         }
         */


        divClue.html(obj.question);
        divCategory.html(obj.category.title);
        divDollars.html("$" + obj.value);


    });

}