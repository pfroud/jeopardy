class AudioManager {
    constructor() {
        this.audio = {

            answerRight: $("audio#answer-correct")[0],
            answerWrong: $("audio#answer-incorrect")[0],
            questionTimeout: $("audio#question-timeout")[0],
            roundEnd: $("audio#round-end")[0],
            teamBuzz: $("audio#team-buzz")[0],
            tick: $("audio#tick")[0]
        };
    }

    play(audioName) {
        const audio = this.audio[audioName];
        if (!audio) {
            console.warn(`can't play audio "${audioName}", not found`);
        }
        audio.play();
    }
}