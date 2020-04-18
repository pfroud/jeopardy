export class AudioManager {
    audio: { answerRight: HTMLElement; answerWrong: HTMLElement; questionTimeout: HTMLElement; roundEnd: HTMLElement; teamBuzz: HTMLElement; tick: HTMLElement; musicClosing: HTMLElement; };
    constructor() {
        this.audio = {

            answerRight: $("audio#answer-correct")[0],
            answerWrong: $("audio#answer-incorrect")[0],
            questionTimeout: $("audio#question-timeout")[0],
            roundEnd: $("audio#round-end")[0],
            teamBuzz: $("audio#team-buzz")[0],
            tick: $("audio#tick")[0],
            musicClosing: $("audio#music-closing")[0]
        };
    }

    play(audioName: string) {
        const audio = this.audio[audioName];
        if (!audio) {
            console.warn(`can't play audio "${audioName}", not found`);
        }
        audio.play();
    }
}