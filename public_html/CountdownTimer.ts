"use strict";

import { AudioManager } from "./operator/AudioManager.js";

export class CountdownTimer {
    private readonly audioManager: AudioManager;
    public updateIntervalMs: number;
    private readonly durationMs: number;/*  */
    public maxMs: number;
    public remainingMs: number;
    hideProgressOnFinish: boolean;
    previousSecondThatPassed: number;
    tsLastInterval: number;
    private intervalID: number;
    private timeoutID: number;
    private hasStarted: boolean;
    private hasFinished: boolean;
    private isPaused: boolean;
    public onStart: () => void;
    public onPause: () => void;
    public onResume: () => void;
    public onReset: () => void;
    public onFinished: () => void;
    public onTick: () => void;
    textElements: Array<JQuery<HTMLDivElement>>;
    progressElements: Array<JQuery<HTMLProgressElement>>;
    dotsElement: JQuery<HTMLTableElement>;

    constructor(durationMs: number, audioManager?: AudioManager) {
        if (!Number.isInteger(durationMs) || !isFinite(durationMs) || isNaN(durationMs)) {
            throw new TypeError("duration is required, and must be an integer number");
        }

        if (durationMs < 1) {
            throw new RangeError("duration cannot be less than one");
        }

        this.audioManager = audioManager;

        this.updateIntervalMs = 100;

        this.durationMs = durationMs;
        this.maxMs = durationMs;
        this.remainingMs = durationMs;

        this.hideProgressOnFinish = false;
        this.previousSecondThatPassed = -1;

        // timestamps in Unix epoch
        this.tsLastInterval = null;

        // value returned by window.setInterval and window.setTimeout, used to cancel them later
        this.intervalID = undefined;
        this.timeoutID = undefined;

        this.hasStarted = false;
        this.hasFinished = false;
        this.isPaused = false;

        // optional custom events
        this.onStart = null;
        this.onPause = null;
        this.onResume = null;
        this.onReset = null;
        this.onFinished = null;
        this.onTick = null;

        // display elements
        this.textElements = [];
        this.progressElements = [];
        this.dotsElement = undefined;
    }

    public togglePaused(): void {
        this.isPaused ? this.resume() : this.pause();
    }

    public pause(): void {
        if (this.hasStarted && !this.hasFinished && !this.isPaused) {
            clearInterval(this.intervalID);
            clearTimeout(this.timeoutID);
            this.isPaused = true;
            this._guiSetPaused(true);

            const presentTs = CountdownTimer.getNowTimestamp();
            const elapsedSinceLastInterval = presentTs - this.tsLastInterval;
            this.remainingMs -= elapsedSinceLastInterval;
            this._guiIntervalUpdate();

            this.onPause && this.onPause();

        }
    }

    public resume(): void {
        if (this.hasStarted && !this.hasFinished && this.isPaused) {

            this.tsLastInterval = CountdownTimer.getNowTimestamp();

            if (this.remainingMs < this.updateIntervalMs) {
                // the interval would only run once more. can use timeout instead.
                clearInterval(this.intervalID);
                this.timeoutID = setTimeout(this._handleInterval, this.remainingMs, this);
            } else {
                this.intervalID = setInterval(this._handleInterval, this.updateIntervalMs, this);
            }

            this.isPaused = false;
            this._guiSetPaused(false);

            this.onResume && this.onResume();
        }
    }

    private _guiSetPaused(isPaused: boolean): void {
        this.progressElements.forEach(elem => elem.toggleClass("paused", isPaused));
        this.textElements.forEach(elem => elem.toggleClass("paused", isPaused));
        this.dotsElement && this.dotsElement.toggleClass("paused", isPaused);
    }

    public reset(): void {
        this.hasStarted = false;
        this.hasFinished = false;
        this.isPaused = false;
        this.remainingMs = this.durationMs;
        clearInterval(this.intervalID);
        clearTimeout(this.timeoutID);

        this._guiReset();
        this.onReset && this.onReset();
    }

    private _guiReset(): void {
        this._guiSetPaused(false);

        this.dotsElement && this.dotsElement.find("td").removeClass("active");

        this.progressElements.forEach(elem => elem.attr("value", this.durationMs).hide());
        this.textElements.forEach(elem => elem.html((this.durationMs / 1000).toFixed(1)));

    }

    public start(): void {
        if (!this.hasStarted && !this.hasFinished) {
            this._guiStart();
            this.hasStarted = true;
            this.tsLastInterval = CountdownTimer.getNowTimestamp();

            this.intervalID = setInterval(this._handleInterval, this.updateIntervalMs, this);
            this.onStart && this.onStart();
        }
    }

    private _guiStart(): void {
        this._guiSetPaused(false);

        this.progressElements.forEach(elem => elem
            .attr("max", this.maxMs)
            .attr("value", this.durationMs)
            .show()
        );


        if (this.dotsElement) {
            const tds = this.dotsElement.find("td");
            if (tds.length !== 9) {
                console.warn("found " + tds.length + "dot(s) element(s), expected exactly 9");
            }
            tds.addClass("active");
        }

        this.textElements.forEach(elem => elem.html((this.durationMs / 1000).toFixed(1)));
    }

    private _handleInterval(instance: CountdownTimer): void {
        const presentTS = CountdownTimer.getNowTimestamp();
        const elapsedSinceLastInterval = presentTS - instance.tsLastInterval;
        instance.remainingMs -= elapsedSinceLastInterval;
        instance.tsLastInterval = presentTS;

        //        console.log(`difference=${elapsedSinceLastInterval}; remaningMS=${instance.remainingMs}`);
        instance._guiIntervalUpdate();

        if (instance.remainingMs <= 0) {
            instance._finish();
        } else if (instance.remainingMs < instance.updateIntervalMs) {
            // interval would only run one more time. can use timeout instead.
            clearInterval(instance.intervalID);
            this.timeoutID = setTimeout(instance._handleInterval, instance.remainingMs, instance);
        }

        instance.onTick && instance.onTick();

    }

    private _guiIntervalUpdate(): void {
        this.textElements.forEach(elem => elem.html((this.remainingMs / 1000).toFixed(1)));

        this.progressElements.forEach(elem => elem.attr("value", this.remainingMs));


        if (this.dotsElement) {
            const secondsThatJustPassed = Math.ceil(this.remainingMs / 1000) + 1; //todo pretty sure the plus one is wrong

            if (this.previousSecondThatPassed !== secondsThatJustPassed) {
                this.dotsElement.find('[data-countdown="' + secondsThatJustPassed + '"]').removeClass("active");
                if (secondsThatJustPassed !== 6 && secondsThatJustPassed !== 1) {
                    this.audioManager.play("tick");
                }
            }

            this.previousSecondThatPassed = secondsThatJustPassed;
        }
    }

    private _finish(): void {
        this.hasFinished = true;
        this.textElements.forEach(elem => elem.html("done"));
        clearInterval(this.intervalID);

        if (this.hideProgressOnFinish) {

            this.progressElements.forEach(elem => elem.hide());
        }
        this.onFinished && this.onFinished();
    }

    static getNowTimestamp(): number {
        return (new Date).getTime();
    }

}