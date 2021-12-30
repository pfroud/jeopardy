export class Settings {
    // How long to show the category in big text in the presentation window
    public displayDurationCategoryMs = 3 * 1000;

    // How long to show the answer in the presentation window
    public displayDurationAnswerMs = 3 * 1000;

    // How long to wait for a team to buzz
    public timeoutWaitForBuzzesMs = 10 * 1000;

    // Once a team has buzzed, how long they have to answer
    public timeoutAnswerMs = 5 * 1000;

    /*
     * Two sources on the quarter-second lockout:
     * https://www.jeopardy.com/jbuzz/behind-scenes/how-does-jeopardy-buzzer-work
     * https://www.facebook.com/Jeopardy/photos/a.187939387923652/710960202288232/
     */
    public durationLockoutMillisec = 250;

    // Set this to 1 to be like the the TV show, set it to 0 for no guessing penalty.
    public wrongAnswerPenaltyMultiplier = 0.5;

    public allowMultipleAnswersToSameQuestion = false;

    // Stop the game when a team reaches this many dollars
    public teamDollarsWhenGameShouldEnd = 10_000;

    private guiInput: {
        displayDurationCategory: HTMLInputElement;
        displayDurationAnswer: HTMLInputElement;
        timeoutWaitForBuzzes: HTMLInputElement;
        timeoutAnswer: HTMLInputElement;
        allowMultipleTries: HTMLInputElement;
    };

    constructor() {
        this.guiInput = {
            displayDurationCategory: document.querySelector("input#display-duration-category"),
            displayDurationAnswer: document.querySelector("input#display-duration-answer"),
            timeoutWaitForBuzzes: document.querySelector("input#timeout-wait-for-buzzes"),
            timeoutAnswer: document.querySelector("input#timeout-answer"),
            allowMultipleTries: document.querySelector("input#allow-multiple-tries")
        };
        Object.freeze(this.guiInput);
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