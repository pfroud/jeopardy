
$(document).ready(function () {

//    var timer = new CountdownTimer(5000);
//    var textElement = timer.textElement = $("div#countdown-text");
//    timer.onFinished = () => textElement.css("color", "red");


    var windowDisplay;

    $("button#openDisplayWindow").on("click", function () {
        windowDisplay = window.open("../display/index.html", "windowDisplay");
    });
    
    
    $("button#showClue").on("click", function () {
        windowDisplay.showClue();
    });

});