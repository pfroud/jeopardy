import { querySelectorAndCheck } from "./commonFunctions";

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

    public readonly ANSWER_CORRECT: HTMLAudioElement;
    public readonly ANSWER_WRONG_OR_ANSWER_TIMEOUT: HTMLAudioElement;
    public readonly QUESTION_TIMEOUT: HTMLAudioElement;
    public readonly ROUND_END: HTMLAudioElement;
    public readonly TEAM_BUZZ: HTMLAudioElement;
    public readonly TICK: HTMLAudioElement;
    public readonly MUSIC_GAME_END: HTMLAudioElement;
    public readonly MUSIC_GAME_START: HTMLAudioElement;
    public readonly DONE_READING_CLUE_QUESTION: HTMLAudioElement;

    public constructor() {
        this.ANSWER_CORRECT = querySelectorAndCheck<HTMLAudioElement>(document, "audio#answer-correct");
        this.ANSWER_WRONG_OR_ANSWER_TIMEOUT = querySelectorAndCheck<HTMLAudioElement>(document, "audio#answer-incorrect");
        this.QUESTION_TIMEOUT = querySelectorAndCheck<HTMLAudioElement>(document, "audio#question-timeout");
        this.ROUND_END = querySelectorAndCheck<HTMLAudioElement>(document, "audio#round-end");
        this.TEAM_BUZZ = querySelectorAndCheck<HTMLAudioElement>(document, "audio#team-buzz");
        this.TICK = querySelectorAndCheck<HTMLAudioElement>(document, "audio#tick");
        this.MUSIC_GAME_END = querySelectorAndCheck<HTMLAudioElement>(document, "audio#music-game-end");
        this.MUSIC_GAME_START = querySelectorAndCheck<HTMLAudioElement>(document, "audio#music-game-start");
        this.DONE_READING_CLUE_QUESTION = querySelectorAndCheck<HTMLAudioElement>(document, "audio#done-reading-clue-question");
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