

$(document).ready(function () {
//    return;
    var clueDiv = $("div#clue");
    var categoryDiv = $("div#category");
    var dollarsDiv = $("div#dollars");

    var spinner = $("div#spinner");

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


        clueDiv.html(obj.question);
        categoryDiv.html(obj.category.title);
        dollarsDiv.html("$" + obj.value);


    });


});