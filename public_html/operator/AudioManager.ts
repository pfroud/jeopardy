interface AudioElements {
    [name: string]: HTMLAudioElement;
}

export class AudioManager {
    private readonly audio: AudioElements;

    constructor() {
        this.audio = {
            answerCorrect: document.querySelector<HTMLAudioElement>("audio#answer-correct"),
            answerIncorrectOrAnswerTimeout: document.querySelector<HTMLAudioElement>("audio#answer-incorrect"),
            questionTimeout: document.querySelector<HTMLAudioElement>("audio#question-timeout"),
            roundEnd: document.querySelector<HTMLAudioElement>("audio#round-end"),
            teamBuzz: document.querySelector<HTMLAudioElement>("audio#team-buzz"),
            tick: document.querySelector<HTMLAudioElement>("audio#tick"),
            musicGameEnd: document.querySelector<HTMLAudioElement>("audio#music-game-end"),
            musicGameStart: document.querySelector<HTMLAudioElement>("audio#music-game-start")
        };
        Object.freeze(this.audio);
    }

    public play(audioName: string): void {
        /*
        Make sure to :
        - Turn off the extension called "Disable HTML5 Autoplay"
        - You might also want to go to Site Settings and change Sound to Allow
        */
        const audio = this.audio[audioName];
        if (!audio) {
            console.warn(`can't play audio with name "{audioName}", not found`);
            return;
        }
        audio.play();
    }
}