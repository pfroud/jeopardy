interface AudioElements {
    [name: string]: HTMLAudioElement;
}

export class AudioManager {
    private readonly audio: AudioElements;

    /*
    Three low-pitch beeps happens in TWO situations:
        (1) Someone buzzes but does not answer within five seconds.
        (2) Time runs out with no buzzes.
    Source video: https://www.youtube.com/watch?v=cGSDLZ5wqy8

    Right now my sounds are slightly different. In situation (1), 
    I'm playing the same sound that plays when someone answers wrong.

    Eight high-pitch beeps, short pause, eight high-pitch beeps
    happens only when the round runs out of time.
    Source video: https://www.youtube.com/watch?v=pFhSKPOF_lI&t=1028
    (I am using this sound correctly.)
    */

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

    public play(audioName: string): Promise<void> {
        /*
        If you're having trouble getting sounds to work:
        - If you've installed the Chrome extension called "Disable HTML5 Autoplay",
          disable it for this domain.
        - You might also want to go to Site Settings (chrome://settings/content)
          and set 'Sound' to 'Allow' for this domain.
        */
        const audio = this.audio[audioName];
        if (!audio) {
            console.warn(`can't play audio with name "${audioName}", not found`);
            return null;
        }

        /*
        The play() method returns a promise which is resolved when playback
        has been STARTED, which is not helpful for us.
        https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
        */

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise#syntax
        const promiseExecutor = (
            resolveFunc: () => void
        ) => {
            // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended_event
            audio.addEventListener("ended", () => resolveFunc());
        };

        audio.play();

        return new Promise<void>(promiseExecutor);
    }
}