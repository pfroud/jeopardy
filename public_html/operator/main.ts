import { Settings } from "../Settings.js";
import { AudioManager } from "./AudioManager.js";
import { Operator } from "./Operator.js";

document.addEventListener("DOMContentLoaded", function () {
    if (window.location.search.length > 1) {
        console.log("not doing anything because window.location.search is set to something");
        return;
    }
    initKeyboardShortcuts();

    const settings = new Settings();
    const audioManager = new AudioManager();

    // So we can access the operator instance in the web browser debugger.
    (window as any).operator = new Operator(audioManager, settings);


    function initKeyboardShortcuts(): void {
        const inputSetup = document.querySelector("input#tab-setup");
        const inputGame = document.querySelector("input#tab-game");
        const inputAdmin = document.querySelector("input#tab-admin");
        const inputSettings = document.querySelector("input#tab-settings");

        document.addEventListener("keydown", function (keyboardEvent) {
            if (document.activeElement?.tagName === "INPUT") {
                return;
            }

            switch (keyboardEvent.key.toLowerCase()) {
                case "s":
                    inputSetup.setAttribute("checked", "checked");
                    break;
                case "g":
                    inputGame.setAttribute("checked", "checked");
                    break;
                case "a":
                    inputAdmin.setAttribute("checked", "checked");
                    break;
                case "e":
                    inputSettings.setAttribute("checked", "checked");
                    //                keyboardEvent.preventDefault(); //chrome opens its menu if holding Alt
                    break;

            }
        });
    }

});
