
import { Settings } from "../Settings.js";
import { AudioManager } from "./AudioManager.js";
import { Operator } from "./Operator.js";

$(document).ready(function () {
    if (window.location.search.length > 1) {
        return;
    }

    initKeyboardShortcuts();

    const settings = new Settings();
    const audioManager = new AudioManager();

    (window as any).operator = new Operator(audioManager, settings);
    let i = 1;
});

function initKeyboardShortcuts(): void {
    const inputSetup = $("input#tab-setup");
    const inputGame = $("input#tab-game");
    const inputAdmin = $("input#tab-admin");
    const inputSettings = $("input#tab-settings");

    document.addEventListener("keydown", function (keyboardEvent) {
        //        if (!keyboardEvent.altKey) {
        //            return;
        //        }

        if (document.activeElement.tagName === "INPUT") {
            return;
        }

        switch (keyboardEvent.key.toLowerCase()) {
            case "s":
                inputSetup.prop("checked", true);
                break;
            case "g":
                inputGame.prop("checked", true);
                break;
            case "a":
                inputAdmin.prop("checked", true);
                break;
            case "e":
                inputSettings.prop("checked", true);
                //                keyboardEvent.preventDefault(); //chrome opens its menu if holding Alt
                break;

        }
    });
}