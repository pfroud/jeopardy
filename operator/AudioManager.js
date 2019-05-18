class AudioManager {
    constructor() {
        this.audioAnswerCorrect = $("audio#answer-correct")[0];
        this.audioAnswerIncorrect = $("audio#answer-incorrect")[0];
        this.audioMusicOpening = $("audio#music-opening")[0];
        this.audioQuestionTimeout = $("audio#question-timeout")[0];
        this.audioRoundEnd = $("audio#round-end")[0];
        this.audioTeamBuzz = $("audio#team-buzz")[0];
    }
}