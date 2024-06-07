import { querySelectorAndCheck } from "./commonFunctions";

export class Settings {
    // How long to show the category in big text in the presentation window
    public displayDurationCategoryMillisec = 3 * 1000;

    // How long to show the answer in the presentation window
    public displayDurationAnswerMillisec = 5 * 1000;

    // How long to wait for a team to buzz
    public timeoutWaitForBuzzesMillisec = 5 * 1000;

    // Once a team has buzzed, how long they have to answer
    public timeoutWaitForAnswerMillisec = 5 * 1000;

    /*
     * Two sources on the quarter-second lockout:
     * https://www.jeopardy.com/jbuzz/behind-scenes/how-does-jeopardy-buzzer-work
     * https://www.facebook.com/Jeopardy/photos/a.187939387923652/710960202288232/
     */
    public durationLockoutMillisec = 250;

    // Set this to 1 to be like the the TV show, set it to 0 for no guessing penalty.
    public wrongAnswerPenaltyMultiplier = 0.5;

    public allowMultipleAnswersToSameQuestion = true;

    // Stop the game when a team reaches this much money
    public teamMoneyWhenGameShouldEnd = 10_000;

    public gameTimeLimitMillisec = 10 * 60 * 1000;

    private readonly GUI_INPUT: {
        readonly DISPLAY_DURATION_CATEGORY: HTMLInputElement;
        readonly DISPLAY_DURATION_ANSWER: HTMLInputElement;
        readonly TIMEOUT_WAIT_FOR_BUZZES: HTMLInputElement;
        readonly TIMEOUT_ANSWER: HTMLInputElement;
        readonly ALLOW_MULTIPLE_TRIES: HTMLInputElement;
    };

    public constructor() {
        this.GUI_INPUT = {
            DISPLAY_DURATION_CATEGORY: querySelectorAndCheck(document, "input#display-duration-category"),
            DISPLAY_DURATION_ANSWER: querySelectorAndCheck(document, "input#display-duration-answer"),
            TIMEOUT_WAIT_FOR_BUZZES: querySelectorAndCheck(document, "input#timeout-wait-for-buzzes"),
            TIMEOUT_ANSWER: querySelectorAndCheck(document, "input#timeout-answer"),
            ALLOW_MULTIPLE_TRIES: querySelectorAndCheck(document, "input#allow-multiple-tries")
        };
        Object.freeze(this.GUI_INPUT);
        this.populateGui();
        querySelectorAndCheck(document, "button#saveSettings").addEventListener("click", () => this.parseGui());
    }

    public populateGui(): void {
        this.GUI_INPUT.DISPLAY_DURATION_CATEGORY.value = String(this.displayDurationCategoryMillisec);
        this.GUI_INPUT.DISPLAY_DURATION_ANSWER.value = String(this.displayDurationAnswerMillisec);
        this.GUI_INPUT.TIMEOUT_WAIT_FOR_BUZZES.value = String(this.timeoutWaitForBuzzesMillisec);
        this.GUI_INPUT.TIMEOUT_ANSWER.value = String(this.timeoutWaitForAnswerMillisec);
        this.GUI_INPUT.ALLOW_MULTIPLE_TRIES.toggleAttribute("checked", this.allowMultipleAnswersToSameQuestion);
    }

    public parseGui(): void {
        this.displayDurationCategoryMillisec = Number(this.GUI_INPUT.DISPLAY_DURATION_CATEGORY.value);
        this.displayDurationAnswerMillisec = Number(this.GUI_INPUT.DISPLAY_DURATION_ANSWER.value);
        this.timeoutWaitForBuzzesMillisec = Number(this.GUI_INPUT.TIMEOUT_WAIT_FOR_BUZZES.value);
        this.timeoutWaitForAnswerMillisec = Number(this.GUI_INPUT.TIMEOUT_ANSWER.value);

        this.allowMultipleAnswersToSameQuestion = this.GUI_INPUT.ALLOW_MULTIPLE_TRIES.hasAttribute("checked");
    }

}