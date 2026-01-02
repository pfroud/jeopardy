export class Settings {
    // How long to show the category in big text in the presentation window
    public displayDurationCategoryMillisec = 1000;

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

    public gameRoundTimeLimitMillisec = 10 * 60 * 1000;

    public timeBeforeRandomClueIsChosen = 10_000;

    public teamToChooseNextClue: "rotate" | "previousCorrectAnswer" = "previousCorrectAnswer";

}