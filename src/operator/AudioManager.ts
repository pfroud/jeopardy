import { querySelectorAndCheck } from "../common";

export class AudioManager {
    private readonly audioElements: { [name: string]: HTMLAudioElement };

    /*
    In the Jeopardy TV show, three low-pitch beeps happens in TWO situations:
        (1) Someone buzzes but does not answer within five seconds.
        (2) Time runs out with no buzzes.
    Source video: https://www.youtube.com/watch?v=cGSDLZ5wqy8

    I am doing the sounds slightly differently. In situation (1), 
    I'm playing the same sound that plays when someone answers wrong.

    Eight high-pitch beeps, short pause, eight high-pitch beeps
    happens only when the round runs out of time.
    Source video: https://www.youtube.com/watch?v=pFhSKPOF_lI&t=1028
    (I am using this sound correctly.)
    */

    public constructor() {
        this.audioElements = {
            answerCorrect: querySelectorAndCheck<HTMLAudioElement>(document, "audio#answer-correct"),
            answerIncorrectOrAnswerTimeout: querySelectorAndCheck<HTMLAudioElement>(document, "audio#answer-incorrect"),
            questionTimeout: querySelectorAndCheck<HTMLAudioElement>(document, "audio#question-timeout"),
            roundEnd: querySelectorAndCheck<HTMLAudioElement>(document, "audio#round-end"),
            teamBuzz: querySelectorAndCheck<HTMLAudioElement>(document, "audio#team-buzz"),
            tick: querySelectorAndCheck<HTMLAudioElement>(document, "audio#tick"),
            musicGameEnd: querySelectorAndCheck<HTMLAudioElement>(document, "audio#music-game-end"),
            musicGameStart: querySelectorAndCheck<HTMLAudioElement>(document, "audio#music-game-start"),
            doneReadingClueQuestion: querySelectorAndCheck<HTMLAudioElement>(document, "audio#done-reading-clue-question")
        };
        Object.freeze(this.audioElements);
    }

    public play(audioName: string): Promise<void> | null {
        /*
        If you're having trouble getting sounds to work:
        - If you've installed the Chrome extension called "Disable HTML5 Autoplay",
          disable it for this domain.
        - You might also want to go to Site Settings (chrome://settings/content)
          and set 'Sound' to 'Allow' for this domain.
        */

        if (!(audioName in this.audioElements)) {
            console.error(`can't play audio with name "${audioName}", unknown key into the object`);
        }

        const audio = this.audioElements[audioName];

        /*
        The play() method returns a promise which is resolved when playback
        has been STARTED, which is not helpful for us.
        https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
        */

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise#syntax
        const promiseExecutor = (
            resolveFunc: () => void
        ): void => {
            // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended_event
            audio.addEventListener("ended", () => resolveFunc());
        };

        audio.play();

        return new Promise<void>(promiseExecutor);
    }
}