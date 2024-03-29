import { AudioManager } from "./AudioManager";

export class CountdownTimer {

    public readonly MAX_DURATION_MILLISEC: number; //the value passed into the constructor
    public onStart?: () => void;
    public onPause?: () => void;
    public onResume?: () => void;
    public onReset?: () => void;
    public onFinished?: () => void;
    public onTick?: () => void;

    private readonly DEBUG = false;
    private static readonly DESIRED_FRAME_RATE_HZ = 30;
    private readonly UPDATE_INTERVAL_MILLISEC = 1000 / CountdownTimer.DESIRED_FRAME_RATE_HZ;
    private readonly AUDIO_MANAGER: AudioManager | undefined;
    private readonly TEXT_ELEMENTS = new Set<HTMLElement>();
    private readonly PROGRESS_ELEMENTS = new Set<HTMLProgressElement>();
    private readonly DOTS_TABLES = new Set<HTMLTableElement>();
    private remainingMillisec: number;
    private previousDotsDeactivated = NaN; //only used for dots elements
    private timestampOfLastInterval = NaN;
    private intervalID = NaN; //value returned by window.setInterval(), used to cancel it later
    private isStarted = false;
    private isFinished = false;
    private isPaused = false;

    public constructor(durationMillisec: number, audioManager?: AudioManager) {
        if (!Number.isInteger(durationMillisec)) {
            throw new TypeError(`duration must be an integer: ${durationMillisec}`);
        }
        if (!isFinite(durationMillisec)) {
            throw new TypeError(`duration must be finite: ${durationMillisec}`);
        }
        if (isNaN(durationMillisec)) {
            throw new TypeError(`duration cannot be NaN: ${durationMillisec}`);
        }
        if (durationMillisec < 1) {
            throw new RangeError(`duration cannot be less than one: ${durationMillisec}`);
        }
        this.AUDIO_MANAGER = audioManager;

        this.MAX_DURATION_MILLISEC = durationMillisec;

        this.remainingMillisec = durationMillisec;
        if (this.DEBUG) {
            console.log(`CountdownTimer constructed with duration ${durationMillisec.toLocaleString()} millisec.`);
        }
    }

    public reset(): void {

        this.remainingMillisec = this.MAX_DURATION_MILLISEC;

        this.setPaused(false);
        this.guiUpdatePaused();

        if (!isNaN(this.intervalID)) {
            clearInterval(this.intervalID);
        }

        this.timestampOfLastInterval = NaN;
        this.intervalID = NaN;
        this.previousDotsDeactivated = NaN;

        this.isStarted = false;
        this.isFinished = false;

        this.PROGRESS_ELEMENTS.forEach(progressElement => {
            progressElement.setAttribute("max", String(this.MAX_DURATION_MILLISEC));
            progressElement.setAttribute("value", String(this.MAX_DURATION_MILLISEC));
        });

        this.DOTS_TABLES.forEach(tableElement =>
            tableElement.querySelectorAll("td").forEach(td => td.classList.remove("active"))
        );

        this.TEXT_ELEMENTS.forEach(divElement => divElement.innerHTML = "Reset");

        this.onReset?.();
    }

    public togglePaused(): void {
        this.isPaused ? this.resume() : this.pause();
    }

    public setPaused(newPaused: boolean): void {
        if (newPaused) {
            this.pause();
        } else {
            this.resume();
        }
    }

    public startOrResume(): void {
        if (this.isStarted) {
            this.resume();
        } else {
            this.start();
        }
    }

    public pause(): void {
        if (this.isStarted && !this.isFinished && !this.isPaused) {
            clearInterval(this.intervalID);
            this.isPaused = true;
            this.guiUpdatePaused();

            const presentTimestamp = Date.now();
            const elapsedMillisecSinceLastInterval = presentTimestamp - this.timestampOfLastInterval;
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

            this.intervalID = window.setInterval(this.handleInterval.bind(this), this.UPDATE_INTERVAL_MILLISEC);


            this.onResume?.();
        } else {
            if (this.DEBUG) {
                console.log("CountdownTimer: called resume but (not started) or (already finished) or (not paused).");
            }
        }
    }

    private guiUpdatePaused(): void {
        this.PROGRESS_ELEMENTS.forEach(elem => elem.classList.toggle("paused", this.isPaused));
        this.TEXT_ELEMENTS.forEach(elem => elem.classList.toggle("paused", this.isPaused));
        this.DOTS_TABLES.forEach(e => e.classList.toggle("paused", this.isPaused));
    }

    public start(): void {
        if (!this.isStarted && !this.isFinished) {
            if (this.DEBUG) {
                console.log("CountdownTimer: started.");
            }
            this.isStarted = true;
            this.timestampOfLastInterval = Date.now();
            this.intervalID = window.setInterval(this.handleInterval.bind(this), this.UPDATE_INTERVAL_MILLISEC);
            this.onStart?.();

            ////////////////////// Update GUI //////////////////////////////////////////////////////////////
            this.guiUpdatePaused();
            this.PROGRESS_ELEMENTS.forEach(progressElement => {
                progressElement.setAttribute("max", String(this.MAX_DURATION_MILLISEC));
                progressElement.setAttribute("value", String(this.MAX_DURATION_MILLISEC));
            });
            this.DOTS_TABLES.forEach(tableElement => {
                const tds = tableElement.querySelectorAll("td");
                if (tds.length !== 9) {
                    console.warn(`found ${tds.length} dots <td> element(s), expected exactly 9`);
                }
                tds.forEach(td => td.classList.add("active"));
            });
            this.TEXT_ELEMENTS.forEach(divElement => divElement.innerHTML = (this.MAX_DURATION_MILLISEC / 1000).toFixed(1));
            /////////////////////////////////////////////////////////////////////////////////////////////////


        } else {
            if (this.DEBUG) {
                console.log("CountdownTimer: called start() but already started or already finished.");
            }
        }
    }

    private handleInterval(): void {
        const presentTimestamp = Date.now(); //unix epoch
        const elapsedMillisecSinceLastInterval = presentTimestamp - this.timestampOfLastInterval;
        this.remainingMillisec -= elapsedMillisecSinceLastInterval;
        this.timestampOfLastInterval = presentTimestamp;

        let logLine = "";
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

        let newText: string;
        const remainingSeconds = this.remainingMillisec / 1000;
        if (this.remainingMillisec > 60 * 1000) {
            const date = new Date(this.remainingMillisec);
            newText = `${date.getMinutes()} min ${date.getSeconds()} sec`;
        } else {
            newText = remainingSeconds.toFixed(1) + " sec";
        }

        this.TEXT_ELEMENTS.forEach(elem => elem.innerHTML = newText);

        this.PROGRESS_ELEMENTS.forEach(elem => elem.setAttribute("value", String(this.remainingMillisec)));

        if (this.DOTS_TABLES) {
            /*
            In the TV show, there are nine light-up rectangles below each contestant which shows
            how much time is left to answer a question.
            Here's a video from the official Jeopardy Youtube channel which shows how it works:
            https://www.youtube.com/watch?v=cGSDLZ5wqy8&t=10s
            
            For some reason I call the rectangles "dots."

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
                this.DOTS_TABLES.forEach(table => {
                    table.querySelectorAll(`td[data-countdown="${dotsToDeactivate}"]`).forEach(td => td.classList.remove("active"));
                    if (dotsToDeactivate !== 6 && dotsToDeactivate !== 1) {
                        /*
                        It is weird to be calling the audioManager from inside a function which claims to be a GUI
                        update (audio is not graphical). Turns out it's nontrivial to figure out when one second
                        has passed so I am leaving it in here.
                        */
                        if (this.AUDIO_MANAGER) {
                            this.AUDIO_MANAGER?.TICK.play();
                        } else {
                            console.warn("dotsTable is true but no audioManager");
                        }
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
        this.TEXT_ELEMENTS.forEach(elem => elem.innerHTML = "done");
        this.DOTS_TABLES.forEach(table => table.querySelectorAll("td").forEach(td => td.classList.remove("active")));
        clearInterval(this.intervalID);

        this.onFinished?.();
    }

    public addTextElement(textElement: HTMLElement): void {
        this.TEXT_ELEMENTS.add(textElement);
    }

    public addProgressElement(progressElement: HTMLProgressElement): void {
        this.PROGRESS_ELEMENTS.add(progressElement);
    }

    public addDotsTable(dotsTable: HTMLTableElement): void {
        this.DOTS_TABLES.add(dotsTable);
    }

    public removeProgressElement(progressElement: HTMLProgressElement): void {
        this.PROGRESS_ELEMENTS.delete(progressElement);
    }

    public removeDotsTable(dotsTable: HTMLTableElement): void {
        this.DOTS_TABLES.delete(dotsTable);
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

    public setRemainingMillisec(remainingMillisec: number): void {
        this.remainingMillisec = remainingMillisec;
        this.guiUpdateForInterval();
        if (this.remainingMillisec <= 0) {
            this.finish();
        }

    }

    /**
     * This function is used for the state machine transition visualizer.
     * If a timeout transition is paused and will never finish before getting
     * reset, I want the green bar to go away.
     */
    public showProgressBarFinished(): void {
        if (!this.isFinished) {
            this.PROGRESS_ELEMENTS.forEach(progress => progress.setAttribute("value", "0"));
            this.TEXT_ELEMENTS.forEach(textElem => textElem.innerHTML = "");
        }
    }


}