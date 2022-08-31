import { AudioManager } from "./operator/AudioManager";

export class CountdownTimer {

    public readonly maxMillisec: number; //the value passed into the constructor
    public onStart?: () => void;
    public onPause?: () => void;
    public onResume?: () => void;
    public onReset?: () => void;
    public onFinished?: () => void;
    public onTick?: () => void;

    private readonly DEBUG = false;
    private static readonly desiredFrameRateHz = 30;
    private readonly updateIntervalMillisec = 1000 / CountdownTimer.desiredFrameRateHz;
    private readonly audioManager: AudioManager;
    private readonly textDivs = new Set<HTMLDivElement>();
    private readonly progressElements = new Set<HTMLProgressElement>();
    private readonly dotsTables = new Set<HTMLTableElement>();
    private remainingMillisec: number;
    private previousDotsDeactivated = NaN; //only used for dots elements
    private timestampOfLastInterval = NaN;
    private intervalID = NaN; //value returned by window.setInterval(), used to cancel it later
    private isStarted = false;
    private isFinished = false;
    private isPaused = false;

    constructor(durationMillisec: number, audioManager?: AudioManager) {
        if (!Number.isInteger(durationMillisec) || !isFinite(durationMillisec) || isNaN(durationMillisec)) {
            throw new TypeError("duration must be an integer: " + durationMillisec);
        }
        if (durationMillisec < 1) {
            throw new RangeError("duration cannot be less than one:" + durationMillisec);
        }
        this.audioManager = audioManager;

        this.maxMillisec = durationMillisec;

        this.remainingMillisec = durationMillisec;
        if (this.DEBUG) {
            console.log(`CountdownTimer constructed with duration ${durationMillisec.toLocaleString()} millisec.`);
        }
    }

    public togglePaused(): void {
        this.isPaused ? this.resume() : this.pause();
    }

    public setPaused(setPaused_: boolean): void {
        if (setPaused_) {
            this.pause();
        } else {
            this.resume();
        }
    }

    public pause(): void {
        if (this.isStarted && !this.isFinished && !this.isPaused) {
            clearInterval(this.intervalID);
            this.isPaused = true;
            this.guiUpdatePaused();

            const presentTS = Date.now();
            const elapsedMillisecSinceLastInterval = presentTS - this.timestampOfLastInterval;
            this.remainingMillisec -= elapsedMillisecSinceLastInterval;

            // update the gui as if a tick from setInterval() happened
            this.guiUpdateForInterval();

            this.onPause?.();

            if (this.DEBUG) {
                console.log(`CountdownTimer: paused. elapsed = ${String(elapsedMillisecSinceLastInterval).padStart(4)}; remaining = ${String(this.remainingMillisec).padStart(4)}. `);
            }
        } else {
            if (this.DEBUG) {
                console.log("CountdownTimer: called pause but (not started) or (already finished) or (already paused).");
            }
        }
    }

    public resume(): void {
        if (this.isStarted && !this.isFinished && this.isPaused) {
            if (this.DEBUG) {
                console.log("CountdownTimer: resumed.");
            }

            this.isPaused = false;
            this.guiUpdatePaused();
            this.timestampOfLastInterval = Date.now();

            this.intervalID = window.setInterval(this.handleInterval.bind(this), this.updateIntervalMillisec);


            this.onResume?.();
        } else {
            if (this.DEBUG) {
                console.log("CountdownTimer: called resume but (not started) or (already finished) or (not paused).");
            }
        }
    }

    private guiUpdatePaused(): void {
        this.progressElements.forEach(elem => elem.classList.toggle("paused", this.isPaused));
        this.textDivs.forEach(elem => elem.classList.toggle("paused", this.isPaused));
        this.dotsTables?.forEach(e => e.classList.toggle("paused", this.isPaused));
    }

    public start(): void {
        if (!this.isStarted && !this.isFinished) {
            if (this.DEBUG) {
                console.log("CountdownTimer: started.");
            }
            this.isStarted = true;
            this.timestampOfLastInterval = Date.now();
            this.intervalID = window.setInterval(this.handleInterval.bind(this), this.updateIntervalMillisec);
            this.onStart?.();

            ////////////////////// Update GUI //////////////////////////////////////////////////////////////
            this.guiUpdatePaused();
            this.progressElements.forEach(progressElement => {
                progressElement.setAttribute("max", String(this.maxMillisec));
                progressElement.setAttribute("value", String(this.maxMillisec));
            });
            if (this.dotsTables) {
                this.dotsTables.forEach(tableElement => {
                    const tds = tableElement.querySelectorAll("td");
                    if (tds.length !== 9) {
                        console.warn(`found ${tds.length} dots <td> element(s), expected exactly 9`);
                    }
                    tds.forEach(td => td.classList.add("active"));
                });
            }
            this.textDivs.forEach(divElement => divElement.innerHTML = (this.maxMillisec / 1000).toFixed(1));
            /////////////////////////////////////////////////////////////////////////////////////////////////


        } else {
            if (this.DEBUG) {
                console.log("CountdownTimer: called start() but already started or already finished.");
            }
        }
    }

    private handleInterval(): void {
        const presentTS = Date.now(); //unix epoch
        const elapsedMillisecSinceLastInterval = presentTS - this.timestampOfLastInterval;
        this.remainingMillisec -= elapsedMillisecSinceLastInterval;
        this.timestampOfLastInterval = presentTS;

        let logLine: string;
        if (this.DEBUG) {
            logLine = `CountdownTimer: handleInterval. elapsed = ${String(elapsedMillisecSinceLastInterval).padStart(4)}; remaining = ${String(this.remainingMillisec).padStart(4)}. `;
        }

        this.guiUpdateForInterval();

        if (this.remainingMillisec <= 0) {
            if (this.DEBUG) {
                logLine += "Finishing.";
            }
            this.finish();
        } else {
            if (this.DEBUG) {
                logLine += "Letting the interval happen again.";
            }
        }

        if (this.DEBUG) {
            console.log(logLine);
        }

        this.onTick?.();

    }

    private guiUpdateForInterval(): void {

        let textToSet: string;
        const remainingSeconds = this.remainingMillisec / 1000;
        if (this.remainingMillisec > 60 * 1000) {
            const date = new Date(this.remainingMillisec);
            textToSet = date.getMinutes() + " min " + date.getSeconds() + " sec";
        } else {
            textToSet = remainingSeconds.toFixed(1) + " sec";
        }

        this.textDivs.forEach(elem => elem.innerHTML = textToSet);

        this.progressElements.forEach(elem => elem.setAttribute("value", String(this.remainingMillisec)));

        if (this.dotsTables) {
            /*
            In the TV show, there are nine light-up rectangles below each contestant which shows
            how much time is left to answer a question.
            Here's a video from the official Jeopardy Youtube channel which shows how it works:
            https://www.youtube.com/watch?v=cGSDLZ5wqy8&t=10s
            
            For some reason I call the rectangles "dots." "

            The dots are numbered 5 - 1 - 5:
            ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │ 5 │ 4 │ 3 │ 2 │ 1 │ 2 │ 3 │ 4 │ 5 │
            └───┴───┴───┴───┴───┴───┴───┴───┴───┘
            
            Here is what we want to do.
            x means the light is on, empty square means the light is off.
            t is the remaining time in seconds.
            ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │ x │ x │ x │ x │ x │ x │ x │ x │ x │  4 < t ≤ 5
            └───┴───┴───┴───┴───┴───┴───┴───┴───┘
            ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │   │ x │ x │ x │ x │ x │ x │ x │   │  3 < t ≤ 4
            └───┴───┴───┴───┴───┴───┴───┴───┴───┘
            ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │   │   │ x │ x │ x │ x │ x │   │   │  2 < t ≤ 3
            └───┴───┴───┴───┴───┴───┴───┴───┴───┘
            ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │   │   │   │ x │ x │ x │   │   │   │  1 < t ≤ 2
            └───┴───┴───┴───┴───┴───┴───┴───┴───┘
            ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │   │   │   │   │ x │   │   │   │   │  0 < t ≤ 1
            └───┴───┴───┴───┴───┴───┴───┴───┴───┘
            ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
            │   │   │   │   │   │   │   │   │   │  t = 0
            └───┴───┴───┴───┴───┴───┴───┴───┴───┘
            */

            const mostRecentIntegerSecondsPassed = Math.ceil(this.remainingMillisec / 1000);
            /*
            As soon as there are four seconds remaining, deactivate dots where data-countdown="5".
            As soon as there are three seconds remaining, deactivate dots where data-countdown="4".
            etc.
            */
            const dotsToDeactivate = mostRecentIntegerSecondsPassed + 1;
            if (this.previousDotsDeactivated !== dotsToDeactivate) {
                this.dotsTables.forEach(table => {
                    table.querySelectorAll(`td[data-countdown="${dotsToDeactivate}"]`).forEach(td => td.classList.remove("active"));
                    if (dotsToDeactivate !== 6 && dotsToDeactivate !== 1) {
                        // TODO kind of weird to call the audioManager from in here. should move it into an onTick function.
                        this.audioManager?.play("tick");
                    }
                });
            }

            this.previousDotsDeactivated = dotsToDeactivate;
        }
    }

    private finish(): void {
        if (this.DEBUG) {
            console.log("CountdownTimer: finished.");
        }
        this.isFinished = true;
        this.textDivs.forEach(elem => elem.innerHTML = "done");
        this.dotsTables?.forEach(table => table.querySelectorAll("td").forEach(td => td.classList.remove("active")));
        clearInterval(this.intervalID);

        this.onFinished?.();
    }

    public addTextDiv(textDiv: HTMLDivElement): void {
        if (!textDiv) {
            throw new Error("trying to add falsey text div");
        }
        this.textDivs.add(textDiv);
    }

    public addProgressElement(progressElement: HTMLProgressElement): void {
        if (!progressElement) {
            throw new Error("trying to add falsey <progress> element");
        }
        this.progressElements.add(progressElement);
    }

    public addDotsTable(dotsTable: HTMLTableElement): void {
        this.dotsTables.add(dotsTable);
    }

    public getRemainingMillisec(): number {
        return this.remainingMillisec;
    }

    public getIsStarted(): boolean {
        return this.isStarted;
    }

    public getIsFinished(): boolean {
        return this.isFinished;
    }


}