interface AudioElements {
    [name: string]: HTMLAudioElement;
}

export class AudioManager {
    private audio: AudioElements;

    constructor() {
        this.audio = {
            answerRight: document.querySelector<HTMLAudioElement>("audio#answer-correct"),
            answerWrong: document.querySelector<HTMLAudioElement>("audio#answer-incorrect"),
            questionTimeout: document.querySelector<HTMLAudioElement>("audio#question-timeout"),
            roundEnd: document.querySelector<HTMLAudioElement>("audio#round-end"),
            teamBuzz: document.querySelector<HTMLAudioElement>("audio#team-buzz"),
            tick: document.querySelector<HTMLAudioElement>("audio#tick"),
            musicClosing: document.querySelector<HTMLAudioElement>("audio#music-closing")
        };
    }

    public play(audioName: string): void {
        const audio = this.audio[audioName];
        if (!audio) {
            console.warn(`can't play audio with name "document.querySelector<HTMLAudioElement>({audioName}", not found`);
            return;
        }
        audio.play();
    }
}