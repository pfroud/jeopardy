class Settings {

    constructor() {
        this.durationDisplayCategory = 5 * 1000;
        this.durationDisplayAnswer = 5 * 1000;

        this.timeoutWaitForBuzzes = 10 * 1000;
        this.timeoutTeamAnswer = 5 * 1000;

        /*
         * Two sources on the quarter-second lockout:
         * https://www.jeopardy.com/jbuzz/behind-scenes/how-does-jeopardy-buzzer-work
         * https://www.facebook.com/Jeopardy/photos/a.187939387923652/710960202288232/
         */
        this.durationLockout = 250;

        this.wrongAnswerPenaltyMultiplier = 0.5; // 1 for the TV show, 0 for no guessing penalty

        this.isAllowedMultipleTries = false;

        this.teamDollarsWhenGameShouldEnd = 10000;

        this.inputDisplayDurationCategory = $("input#displayDurationCategory");
        this.inputDisplayDurationAnswer = $("input#displayDurationAnswer");
        this.inputTimeoutQuestion = $("input#timeoutQuestion");
        this.inputTimeoutAnswer = $("input#timeoutAnswer");
        this.inputAllowMultipleTries = $("input#allowMultipleTries");


        this.populateGui();

        $("button#saveSettings").on("click", () => this.parseGui());

    }

    populateGui() {
        this.inputDisplayDurationCategory.val(this.displayDurationCategory);
        this.inputDisplayDurationAnswer.val(this.displayDurationAnswer);
        this.inputTimeoutQuestion.val(this.questionTimeout);
        this.inputTimeoutAnswer.val(this.answerTimeout);
        this.inputAllowMultipleTries.prop("checked", this.isAllowedMultipleTries);
    }

    parseGui() {

        this.displayDurationCategory = Number(this.inputDisplayDurationCategory.val());
        this.displayDurationAnswer = Number(this.inputDisplayDurationAnswer.val());
        this.questionTimeout = Number(this.inputTimeoutQuestion.val());
        this.answerTimeout = Number(this.inputTimeoutAnswer.val());

        this.isAllowedMultipleTries = this.inputAllowMultipleTries.prop("checked");
    }

}