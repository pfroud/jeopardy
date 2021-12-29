export class Settings {
    displayDurationCategoryMs: number;
    displayDurationAnswerMs: number;
    timeoutWaitForBuzzesMs: number;
    timeoutAnswerMs: number;
    durationLockout: number;
    wrongAnswerPenaltyMultiplier: number;
    allowMultipleAnswersToSameQuestion: boolean;
    teamDollarsWhenGameShouldEnd: number;
    guiInput: {
        displayDurationCategory: HTMLInputElement;
        displayDurationAnswer: HTMLInputElement;
        timeoutWaitForBuzzes: HTMLInputElement;
        timeoutAnswer: HTMLInputElement;
        allowMultipleTries: HTMLInputElement;
    };

    constructor() {
        // how long to show stuff on the presentation window
        this.displayDurationCategoryMs = 3 * 1000;
        this.displayDurationAnswerMs = 3 * 1000;

        // how long to wait for people to answer
        this.timeoutWaitForBuzzesMs = 10 * 1000;
        this.timeoutAnswerMs = 5 * 1000;

        /*
         * Two sources on the quarter-second lockout:
         * https://www.jeopardy.com/jbuzz/behind-scenes/how-does-jeopardy-buzzer-work
         * https://www.facebook.com/Jeopardy/photos/a.187939387923652/710960202288232/
         */
        this.durationLockout = 250;

        //set this to 1 to be like the the TV show, 0 for no guessing penalty
        this.wrongAnswerPenaltyMultiplier = 0.5;

        this.allowMultipleAnswersToSameQuestion = false;

        this.teamDollarsWhenGameShouldEnd = 10000;

        this.guiInput = {
            displayDurationCategory: document.querySelector("input#display-duration-category"),
            displayDurationAnswer: document.querySelector("input#display-duration-answer"),
            timeoutWaitForBuzzes: document.querySelector("input#timeout-wait-for-buzzes"),
            timeoutAnswer: document.querySelector("input#timeout-answer"),
            allowMultipleTries: document.querySelector("input#allow-multiple-tries")
        };

        this.populateGui();

        document.querySelector("button#saveSettings").addEventListener("click", () => this.parseGui());

    }

    public populateGui(): void {
        this.guiInput.displayDurationCategory.value = String(this.displayDurationCategoryMs);
        this.guiInput.displayDurationAnswer.value = String(this.displayDurationAnswerMs);
        this.guiInput.timeoutWaitForBuzzes.value = String(this.timeoutWaitForBuzzesMs);
        this.guiInput.timeoutAnswer.value = String(this.timeoutAnswerMs);
        this.guiInput.allowMultipleTries.toggleAttribute("checked", this.allowMultipleAnswersToSameQuestion);
    }

    public parseGui(): void {
        this.displayDurationCategoryMs = Number(this.guiInput.displayDurationCategory.value);
        this.displayDurationAnswerMs = Number(this.guiInput.displayDurationAnswer.value);
        this.timeoutWaitForBuzzesMs = Number(this.guiInput.timeoutWaitForBuzzes.value);
        this.timeoutAnswerMs = Number(this.guiInput.timeoutAnswer.value);

        this.allowMultipleAnswersToSameQuestion = this.guiInput.allowMultipleTries.hasAttribute("checked");
    }

}