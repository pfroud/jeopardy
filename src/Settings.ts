export class Settings {
    /**
     * After the human operator clicks on a clue on the game board, the category name
     * and clue value are shown in big text for this amount of time before showing
     * the clue question.
     */
    public displayDurationCategoryMillisec = 1000;

    /** 
     * After the human operator presses space to indicate that they are done reading
     * the clue question out loud, there is this much time for players to buzz before
     * the answer is automatically shown to everyone.
     */
    public timeoutWaitForBuzzesMillisec = 5 * 1000;

    /**
     * Once a team has buzzed, they have this much time to say  an answer before their
     * answer is counted as wrong.
     */
    public timeoutWaitForAnswerMillisec = 5 * 1000;

    /**
     * If teams press their buzzer BEFORE the operator has finished reading the clue
     * question out loud, this buzzer is disabled for this amount of time.
     * 
     * Two sources for the lockout being one-quarter of a second:
     * - https://www.jeopardy.com/jbuzz/behind-scenes/how-does-jeopardy-buzzer-work
     * - https://www.facebook.com/Jeopardy/photos/a.187939387923652/710960202288232
     */
    public durationLockoutMillisec = 250;

    /**
     * When a team answers wrong (or doesn't say an answer in time after buzzing),
     * the amount of money subtracted from their team is the clue value multiplied
     * by this number.
     * 
     * Set this to 1 to be like the the TV show; set it to 0 for no guessing penalty.
     */
    public wrongAnswerPenaltyMultiplier = 0.5;

    public allowMultipleAnswersToSameQuestion = true;

    public gameRoundTimeLimitMillisec = 10 * 60 * 1000;

    /**
     * If a clue is not selected on the game board after this amount of time, a random
     * clue is automatically chosen.
     */
    public gameBoardChooseClueTimeout = 10_000;

    /**
     * Method to determine which team gets to choose clues.
     * 
     * - When set to "rotate": team 1 chooses first, then team 2, etc, until it wraps back around to team 1.
     * - When set to "previousCorrectAnswer": team 1 chooses first. When a team answers a clue correctly, they
     *   get to choose the next clue.
     */
    public teamToChooseNextClue: "rotate" | "previousCorrectAnswer" = "previousCorrectAnswer";

}