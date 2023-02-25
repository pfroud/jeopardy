import { querySelectorAndCheck } from "./common";

export class AudioManager {
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

    If you're having trouble getting sounds to work:
        - If you've installed the Chrome extension called "Disable HTML5 Autoplay",
          disable it for this domain.
        - You might also want to go to Site Settings (chrome://settings/content)
          and set 'Sound' to 'Allow' for this domain.
    */

    public readonly answerCorrect: HTMLAudioElement;
    public readonly answerIncorrectOrAnswerTimeout: HTMLAudioElement;
    public readonly questionTimeout: HTMLAudioElement;
    public readonly roundEnd: HTMLAudioElement;
    public readonly teamBuzz: HTMLAudioElement;
    public readonly tick: HTMLAudioElement;
    public readonly musicGameEnd: HTMLAudioElement;
    public readonly musicGameStart: HTMLAudioElement;
    public readonly doneReadingClueQuestion: HTMLAudioElement;

    public constructor() {
        this.answerCorrect = querySelectorAndCheck<HTMLAudioElement>(document, "audio#answer-correct");
        this.answerIncorrectOrAnswerTimeout = querySelectorAndCheck<HTMLAudioElement>(document, "audio#answer-incorrect");
        this.questionTimeout = querySelectorAndCheck<HTMLAudioElement>(document, "audio#question-timeout");
        this.roundEnd = querySelectorAndCheck<HTMLAudioElement>(document, "audio#round-end");
        this.teamBuzz = querySelectorAndCheck<HTMLAudioElement>(document, "audio#team-buzz");
        this.tick = querySelectorAndCheck<HTMLAudioElement>(document, "audio#tick");
        this.musicGameEnd = querySelectorAndCheck<HTMLAudioElement>(document, "audio#music-game-end");
        this.musicGameStart = querySelectorAndCheck<HTMLAudioElement>(document, "audio#music-game-start");
        this.doneReadingClueQuestion = querySelectorAndCheck<HTMLAudioElement>(document, "audio#done-reading-clue-question");
    }

    public playInOrder(...audioElements: HTMLAudioElement[]): void {
        this.playInOrderRecursiveHelper(audioElements, 0, null);
    }

    private playInOrderRecursiveHelper(
        allAudioElements: HTMLAudioElement[],
        indexToPlayNow: number,
        eventListenerToRemoveFromPreviousAudio: (() => void) | null
    ): void {
        /*
       The play() method returns a promise which is resolved when playback
       has been STARTED, which is not what we want.
       https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
       
       We want to add an event listener for when the audio has ENDED.
       https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended_event
       */
        const onAudioEnd = (): void => {
            if (indexToPlayNow > 0 && eventListenerToRemoveFromPreviousAudio) {
                allAudioElements[indexToPlayNow - 1].removeEventListener("ended", eventListenerToRemoveFromPreviousAudio);
            }
            if (indexToPlayNow < allAudioElements.length - 1) {
                this.playInOrderRecursiveHelper(allAudioElements, indexToPlayNow + 1, onAudioEnd);
            }
        };

        allAudioElements[indexToPlayNow].addEventListener("ended", onAudioEnd);
        allAudioElements[indexToPlayNow].play();
    }
}