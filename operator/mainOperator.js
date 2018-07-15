



const SETTINGS = new Settings();

var operatorInstance = null;
$(document).ready(function () {
    if (window.location.search.length < 1) {
        operatorInstance = new Operator();
    }
    initKeyboardShortcuts();
});

function handleDisplayWindowReady() {
    operatorInstance.initTeams();
}

function initKeyboardShortcuts() {
    const inputSetup = $("input#tabSetup");
    const inputOperate = $("input#tabOperate");
    const inputAdmin = $("input#tabAdmin");
    const inputSettings = $("input#tabSettings");

    document.addEventListener("keydown", function (keyboardEvent) {
//        if (!keyboardEvent.altKey) {
//            return;
//        }

/*
 $('input[type="radio"]:checked').attr("id") 
 */

        switch (keyboardEvent.key.toLowerCase()) {
            case "s":
                inputSetup.prop("checked", true);
                break;
            case "o":
                inputOperate.prop("checked", true);
                break;
            case "a":
                inputAdmin.prop("checked", true);
                break;
            case "e":
                inputSettings.prop("checked", true);
//                keyboardEvent.preventDefault(); //chrome opens its menu
                break;

        }
    });
}