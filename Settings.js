class Settings {

    constructor() {
        this.displayDurationCategory = 4 * 1000;
        this.displayDurationAnswer = 3 * 1000;

        this.questionTimeout = 10 * 1000;
        this.answerTimeout = 5 * 1000;
        
        this.lockoutDuration = 250;
        
        this.incorrectAnswerPenaltyMultiplier = 0.5; // 1 for the TV show, 0 for no guessing penalty

        this.isAllowedMultipleTries = false;

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