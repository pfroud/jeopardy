import { AudioManager } from "./operator/AudioManager.js";

export class CountdownTimer {
    public readonly textDivs: HTMLDivElement[] = [];
    public readonly progressElements: HTMLProgressElement[] = [];
    public readonly dotsTables: HTMLTableElement[] = [];
    public maxMs: number;
    public remainingMs: number;
    public onStart?: () => void;
    public onPause?: () => void;
    public onResume?: () => void;
    public onReset?: () => void;
    public onFinished?: () => void;
    public onTick?: () => void;
    public hideProgressOnFinish = false;


    private readonly updateIntervalMs = 50;
    private readonly audioManager: AudioManager;
    private readonly durationMs: number;
    private previousSecondThatPassed = -1;
    private tsLastInterval: number; //timestamp in Unix epoch
    private hasStarted = false;
    private hasFinished = false;
    private isPaused = false;
    private intervalID: number; //value returned by window.setInterval(), used to cancel it later
    private timeoutID: number; //value returned by window.setTimeout(), used to cancel it later

    constructor(durationMs: number, audioManager?: AudioManager) {
        if (!Number.isInteger(durationMs) || !isFinite(durationMs) || isNaN(durationMs)) {
            throw new TypeError("duration is required, and must be an integer number");
        }
        if (durationMs < 1) {
            throw new RangeError("duration cannot be less than one");
        }
        this.audioManager = audioManager;
        this.durationMs = durationMs;
        this.maxMs = durationMs;
        this.remainingMs = durationMs;
    }

    public togglePaused(): void {
        this.isPaused ? this.resume() : this.pause();
    }

    public pause(): void {
        if (this.hasStarted && !this.hasFinished && !this.isPaused) {
            clearInterval(this.intervalID);
            clearTimeout(this.timeoutID);
            this.isPaused = true;
            this.guiSetPaused(true);

            const presentTs = CountdownTimer.getNowTimestamp();
            const elapsedSinceLastInterval = presentTs - this.tsLastInterval;
            this.remainingMs -= elapsedSinceLastInterval;
            this.guiIntervalUpdate();

            this.onPause?.();

        }
    }

    public resume(): void {
        if (this.hasStarted && !this.hasFinished && this.isPaused) {

            this.tsLastInterval = CountdownTimer.getNowTimestamp();

            if (this.remainingMs < this.updateIntervalMs) {
                // the interval would only run once more. can use timeout instead.
                clearInterval(this.intervalID);
                this.timeoutID = setTimeout(this.handleInterval, this.remainingMs, this);
            } else {
                this.intervalID = setInterval(this.handleInterval, this.updateIntervalMs, this);
            }

            this.isPaused = false;
            this.guiSetPaused(false);

            this.onResume?.();
        }
    }

    private guiSetPaused(isPaused: boolean): void {
        this.progressElements.forEach(elem => elem.classList.toggle("paused", isPaused));
        this.textDivs.forEach(elem => elem.classList.toggle("paused", isPaused));
        this.dotsTables?.forEach(e => e.classList.toggle("paused", isPaused));
    }

    public reset(): void {
        this.hasStarted = false;
        this.hasFinished = false;
        this.isPaused = false;
        this.remainingMs = this.durationMs;
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
            this.guiStart();
            this.hasStarted = true;
            this.tsLastInterval = CountdownTimer.getNowTimestamp();

            this.intervalID = setInterval(this.handleInterval, this.updateIntervalMs, this);
            this.onStart?.();
        }
    }

    private guiStart(): void {
        this.guiSetPaused(false);

        this.progressElements.forEach(elem => {
            elem.setAttribute("max", String(this.maxMs));
            elem.setAttribute("value", String(this.durationMs));
            elem.style.display = "";
        });


        if (this.dotsTables) {
            this.dotsTables.forEach(table => {
                const tds = table.querySelectorAll("td");
                if (tds.length !== 9) {
                    console.warn(`found ${tds.length} dots <td> element(s), expected exactly 9`);
                }
                tds.forEach(td => td.classList.add("active"));
            });
        }

        this.textDivs.forEach(elem => elem.innerHTML = (this.durationMs / 1000).toFixed(1));
    }

    private handleInterval(instance: CountdownTimer): void {
        const presentTS = CountdownTimer.getNowTimestamp();
        const elapsedSinceLastInterval = presentTS - instance.tsLastInterval;
        instance.remainingMs -= elapsedSinceLastInterval;
        instance.tsLastInterval = presentTS;

        //        console.log(`difference=${elapsedSinceLastInterval}; remaningMS=${instance.remainingMs}`);
        instance.guiIntervalUpdate();

        if (instance.remainingMs <= 0) {
            instance.finish();
        } else if (instance.remainingMs < instance.updateIntervalMs) {
            // interval would only run one more time. can use timeout instead.
            clearInterval(instance.intervalID);
            this.timeoutID = setTimeout(instance.handleInterval, instance.remainingMs, instance);
        }

        instance.onTick?.();

    }

    private guiIntervalUpdate(): void {
        this.textDivs.forEach(elem => elem.innerHTML = (this.remainingMs / 1000).toFixed(1));

        this.progressElements.forEach(elem => elem.setAttribute("value", String(this.remainingMs)));


        if (this.dotsTables) {
            const secondsThatJustPassed = Math.ceil(this.remainingMs / 1000) + 1; //todo pretty sure the plus one is wrong

            if (this.previousSecondThatPassed !== secondsThatJustPassed) {
                this.dotsTables.forEach(table => {

                    table.querySelectorAll('td[data-countdown="' + secondsThatJustPassed + '"]')
                        .forEach(td => td.classList.remove("active"));

                    if (secondsThatJustPassed !== 6 && secondsThatJustPassed !== 1) {
                        this.audioManager.play("tick");
                    }
                });
            }

            this.previousSecondThatPassed = secondsThatJustPassed;
        }
    }

    private finish(): void {
        this.hasFinished = true;
        this.textDivs.forEach(elem => elem.innerHTML = "done");
        this.dotsTables?.forEach(table => table.querySelectorAll("td").forEach(td => td.classList.remove("active")));
        clearInterval(this.intervalID);

        if (this.hideProgressOnFinish) {
            this.progressElements.forEach(elem => elem.style.display = "none");
        }
        this.onFinished?.();
    }

    static getNowTimestamp(): number {
        return (new Date).getTime();
    }

}