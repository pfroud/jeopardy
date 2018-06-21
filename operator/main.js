
$(document).ready(function () {

    var timer = new CountdownTimer(5000);
    var textElement = timer.textElement = $("div#countdown-text");
    timer.onFinished = () => textElement.css("color", "red");

    $("button#go").on("click", function () {
        timer.start();
    });

});