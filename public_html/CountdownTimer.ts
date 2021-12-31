import { AudioManager } from "./operator/AudioManager.js";

export class CountdownTimer {
    public readonly textDivs: HTMLDivElement[] = [];
    public readonly progressElements: HTMLProgressElement[] = [];
    public readonly dotsTables: HTMLTableElement[] = [];
    public readonly maxMillisec: number; //the value passed into the constructor
    public remainingMillisec: number;
    public onStart?: () => void;
    public onPause?: () => void;
    public onResume?: () => void;
    public onReset?: () => void;
    public onFinished?: () => void;
    public onTick?: () => void;
    public hideProgressOnFinish = false;

    private readonly DEBUG = true;
    private readonly updateIntervalMillisec = 1000; //how long between ticks
    private readonly audioManager: AudioManager;
    private readonly durationMs: number;
    private previousSecondThatPassed = NaN; //only used for dots elements I think
    private timestampOfLastInterval = NaN;
    private hasStarted = false;
    private hasFinished = false;
    private isPaused = false;
    private intervalID = NaN; //value returned by window.setInterval(), used to cancel it later
    private timeoutID = NaN; //value returned by window.setTimeout(), used to cancel it later

    constructor(durationMs: number, audioManager?: AudioManager) {
        if (!Number.isInteger(durationMs) || !isFinite(durationMs) || isNaN(durationMs)) {
            throw new TypeError("duration is required, and must be an integer number");
        }
        if (durationMs < 1) {
            throw new RangeError("duration cannot be less than one");
        }
        this.audioManager = audioManager;
        this.durationMs = durationMs; //isn't this the same as maxMillisec?
        this.maxMillisec = durationMs;
        this.remainingMillisec = durationMs;
        if (this.DEBUG) {
            console.log(`CountdownTimer constructed with duration ${durationMs.toLocaleString()} millisec.`);
        }
    }

    public togglePaused(): void {
        if (this.DEBUG) {
            console.log("CountdownTimer: togglePaused().");
        }
        this.isPaused ? this.resume() : this.pause();
    }

    public pause(): void {
        if (this.hasStarted && !this.hasFinished && !this.isPaused) {
            if (this.DEBUG) {
                console.log("CountdownTimer: paused.");
            }
            clearInterval(this.intervalID);
            clearTimeout(this.timeoutID);
            this.isPaused = true;
            this.guiSetPaused(true);

            const presentTs = Date.now();
            const elapsedSinceLastInterval = presentTs - this.timestampOfLastInterval;
            this.remainingMillisec -= elapsedSinceLastInterval;
            this.guiIntervalUpdate();

            this.onPause?.();
        } else {
            if (this.DEBUG) {
                console.log("CountdownTimer: called pause but (not started) or (already finished) or (already paused).");
            }
        }
    }

    public resume(): void {
        if (this.hasStarted && !this.hasFinished && this.isPaused) {
            if (this.DEBUG) {
                console.log("CountdownTimer: resumed.");
            }

            this.timestampOfLastInterval = Date.now();

            if (this.remainingMillisec < this.updateIntervalMillisec) {
                // the interval would only run once more. can use timeout instead.
                clearInterval(this.intervalID);
                this.timeoutID = setTimeout(this.handleInterval.bind(this), this.remainingMillisec);
            } else {
                this.intervalID = setInterval(this.handleInterval.bind(this), this.updateIntervalMillisec);
            }

            this.isPaused = false;
            this.guiSetPaused(false);

            this.onResume?.();
        } else {
            if (this.DEBUG) {
                console.log("CountdownTimer: called resume but (not started) or (already finished) or (not paused).");
            }
        }
    }

    private guiSetPaused(isPaused: boolean): void {
        this.progressElements.forEach(elem => elem.classList.toggle("paused", isPaused));
        this.textDivs.forEach(elem => elem.classList.toggle("paused", isPaused));
        this.dotsTables?.forEach(e => e.classList.toggle("paused", isPaused));
    }

    public reset(): void {
        if (this.DEBUG) {
            console.log("CountdownTimer: reset.");
        }
        this.hasStarted = false;
        this.hasFinished = false;
        this.isPaused = false;
        this.remainingMillisec = this.durationMs;
        clearInterval(this.intervalID);
        clearTimeout(this.timeoutID);

        this.guiReset();
        this.onReset?.();
    }

    private guiReset(): void {
        this.guiSetPaused(false);

        this.dotsTables?.forEach(table => table.querySelectorAll("td").forEach(td => td.classList.remove("active")));

        this.progressElements.forEach(elem => {
            elem.setAttribute("value", String(this.durationMs));
            elem.style.display = "none"
        });

        this.textDivs.forEach(elem => elem.innerHTML = (this.durationMs / 1000).toFixed(1));

    }

    public start(): void {
        if (!this.hasStarted && !this.hasFinished) {
            if (this.DEBUG) {
                console.log("CountdownTimer: started.");
            }
            this.hasStarted = true;
            this.timestampOfLastInterval = Date.now();
            this.intervalID = setInterval(this.handleInterval.bind(this), this.updateIntervalMillisec);
            this.onStart?.();

            ////////////////////// Update GUI //////////////////////////////////////////////////////////////
            this.guiSetPaused(false);
            this.progressElements.forEach(progressElement => {
                progressElement.setAttribute("max", String(this.maxMillisec));
                progressElement.setAttribute("value", String(this.durationMs));
                progressElement.style.display = ""; // in case of hideProgressOnFinish
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
            this.textDivs.forEach(divElement => divElement.innerHTML = (this.durationMs / 1000).toFixed(1));
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

        if (this.DEBUG) {
            console.log(`now = ${presentTS}; elapsed = ${String(elapsedMillisecSinceLastInterval).padStart(4)}; remaining = ${String(this.remainingMillisec).padStart(4)}`);
        }
        this.guiIntervalUpdate();

        if (this.remainingMillisec <= 0) {
            this.finish();
        } else if (this.remainingMillisec < this.updateIntervalMillisec) {
            // interval would only run one more time. can use timeout instead.
            clearInterval(this.intervalID);
            this.timeoutID = setTimeout(this.handleInterval.bind(this), this.remainingMillisec);
        }

        this.onTick?.();

    }

    private guiIntervalUpdate(): void {
        this.textDivs.forEach(elem => elem.innerHTML = (this.remainingMillisec / 1000).toFixed(1));

        this.progressElements.forEach(elem => elem.setAttribute("value", String(this.remainingMillisec)));


        if (this.dotsTables) {
            const secondsThatJustPassed = Math.ceil(this.remainingMillisec / 1000) + 1; //todo pretty sure the plus one is wrong

            if (this.previousSecondThatPassed !== secondsThatJustPassed) {
                this.dotsTables.forEach(table => {

                    table.querySelectorAll('td[data-countdown="' + secondsThatJustPassed + '"]')
                        .forEach(td => td.classList.remove("active"));

                    if (secondsThatJustPassed !== 6 && secondsThatJustPassed !== 1) {
                        this.audioManager?.play("tick");
                    }
                });
            }

            this.previousSecondThatPassed = secondsThatJustPassed;
        }
    }

    private finish(): void {
        if (this.DEBUG) {
            console.log("CountdownTimer: finished.");
        }
        this.hasFinished = true;
        this.textDivs.forEach(elem => elem.innerHTML = "done");
        this.dotsTables?.forEach(table => table.querySelectorAll("td").forEach(td => td.classList.remove("active")));
        clearInterval(this.intervalID);

        if (this.hideProgressOnFinish) {
            this.progressElements.forEach(elem => elem.style.display = "none");
        }
        this.onFinished?.();
    }


}