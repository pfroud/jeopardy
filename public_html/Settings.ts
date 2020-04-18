export class Settings {

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
            displayDurationCategory: $("input#display-duration-category"),
            displayDurationAnswer: $("input#display-duration-answer"),
            timeoutWaitForBuzzes: $("input#timeout-wait-for-buzzes"),
            timeoutAnswer: $("input#timeout-answer"),
            allowMultipleTries: $("input#allow-multiple-tries")
        };

        this.populateGui();

        $("button#saveSettings").on("click", () => this.parseGui());

    }

    populateGui() {
        this.guiInput.displayDurationCategory.val(this.displayDurationCategoryMs);
        this.guiInput.displayDurationAnswer.val(this.displayDurationAnswerMs);
        this.guiInput.timeoutWaitForBuzzes.val(this.timeoutWaitForBuzzesMs);
        this.guiInput.timeoutAnswer.val(this.timeoutAnswerMs);
        this.guiInput.allowMultipleTries.prop("checked", this.allowMultipleAnswersToSameQuestion);
    }

    parseGui() {
        this.displayDurationCategoryMs = Number(this.guiInput.displayDurationCategory.val());
        this.displayDurationAnswerMs = Number(this.guiInput.displayDurationAnswer.val());
        this.timeoutWaitForBuzzesMs = Number(this.guiInput.timeoutWaitForBuzzes.val());
        this.timeoutAnswerMs = Number(this.guiInput.timeoutAnswer.val());

        this.allowMultipleAnswersToSameQuestion = this.guiInput.allowMultipleTries.prop("checked");
    }

}