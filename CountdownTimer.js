"use strict";

class CountdownTimer {

    constructor(durationMs, audioManager) {
        if (!Number.isInteger(durationMs) || !isFinite(durationMs) || isNaN(durationMs)) {
            throw new TypeError("duration is required, and must be an integer number");
        }

        if (durationMs < 1) {
            throw new RangeError("duration cannot be less than one");
        }

        this.audioManager = audioManager;

        // TODO rename this displayUpdateInterval or something
        this.intervalMs = 100;

        this.durationMs = durationMs;
        this.maxMs = durationMs;
        this.remainingMs = durationMs;

        this.hideProgressOnFinish = false;
        this.previousSecondThatPassed = -1;

        // timestamps in Unix epoch
        this.tsLastInterval = null;

        // value returned by window.setInterval and window.setTimeout, used to cancel them later
        this.intervalID = null;
        this.timeoutID = null;

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
        this.textElement = null;
        this.progressElements = [];
        this.dotsElement = null;
    }

    togglePaused() {
        this.isPaused ? this.resume() : this.pause();
    }
    
    pause() {
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

    resume() {
        if (this.hasStarted && !this.hasFinished && this.isPaused) {

            this.tsLastInterval = CountdownTimer.getNowTimestamp();

            if (this.remainingMs < this.intervalMs) {
                // the interval would only run once more. can use timeout instead.
                clearInterval(this.intervalID);
                this.timeoutID = setTimeout(this._handleInterval, this.remainingMs, this);
            } else {
                this.intervalID = setInterval(this._handleInterval, this.intervalMs, this);
            }

            this.isPaused = false;
            this._guiSetPaused(false);

            this.onResume && this.onResume();
        }
    }

    _guiSetPaused(isPaused) {
        this.progressElements.forEach(elem => elem.toggleClass("paused", isPaused));
        this.dotsElement && this.dotsElement.toggleClass("paused", isPaused);
        this.textElement && this.textElement.toggleClass("paused", isPaused);
    }

    reset() {
        this.hasStarted = false;
        this.hasFinished = false;
        this.isPaused = false;
        this.remainingMs = this.durationMs;
        clearInterval(this.intervalID);
        clearTimeout(this.timeoutID);

        this._guiReset();
        this.onReset && this.onReset();
    }

    _guiReset() {
        this._guiSetPaused(false);

        this.dotsElement && this.dotsElement.find("td").removeClass("active");

        this.progressElements.forEach(elem => elem.attr("value", this.durationMs).hide());
        this.textElement && this.textElement.html((this.durationMs / 1000).toFixed(1));

    }

    start() {
        if (!this.hasStarted && !this.hasFinished) {
            this._guiStart();
            this.hasStarted = true;
            this.tsLastInterval = CountdownTimer.getNowTimestamp();

            this.intervalID = setInterval(this._handleInterval, this.intervalMs, this);
            this.onStart && this.onStart();
        }
    }

    _guiStart() {
        this._guiSetPaused(false);

        this.progressElements.forEach(elem => elem
                    .attr("max", this.maxMs)
                    .attr("value", this.durationMs)
                    .show()
        );


        if (this.dotsElement) {
            var tds = this.dotsElement.find("td");
            if (tds.length !== 9) {
                console.warn("found " + tds.length + "dot(s) element(s), expected exactly 9");
            }
            tds.addClass("active");
        }

        this.textElement && this.textElement.html((this.durationMs / 1000).toFixed(1));
    }

    _handleInterval(instance) {
        const presentTS = CountdownTimer.getNowTimestamp();
        const elapsedSinceLastInterval = presentTS - instance.tsLastInterval;
        instance.remainingMs -= elapsedSinceLastInterval;
        instance.tsLastInterval = presentTS;

//        console.log(`difference=${elapsedSinceLastInterval}; remaningMS=${instance.remainingMs}`);
        instance._guiIntervalUpdate();

        if (instance.remainingMs <= 0) {
            instance._finish();
        } else if (instance.remainingMs < instance.intervalMs) {
            // interval would only run one more time. can use timeout instead.
            clearInterval(instance.intervalID);
            this.timeoutID = setTimeout(instance._handleInterval, instance.remainingMs, instance);
        }

        instance.onTick && instance.onTick();

    }

    _guiIntervalUpdate() {
        this.textElement && this.textElement.html((this.remainingMs / 1000).toFixed(1));


        this.progressElements.forEach(elem => elem.attr("value", this.remainingMs));


        if (this.dotsElement) {
            const secondsThatJustPassed = Math.ceil(this.remainingMs / 1000) + 1; //todo pretty sure theh plus one is wrong

            if (this.previousSecondThatPassed !== secondsThatJustPassed) {
                this.dotsElement.find('[data-countdown="' + secondsThatJustPassed + '"]').removeClass("active");
                if (secondsThatJustPassed !== 6 && secondsThatJustPassed !== 1) {
                    this.audioManager.play("tick");
                }
            }

            this.previousSecondThatPassed = secondsThatJustPassed;
//            }
        }
    }

    _finish() {
        this.hasFinished = true;
        this.textElement && this.textElement.html("done");
        clearInterval(this.intervalID);

        if (this.hideProgressOnFinish) {
            
            this.progressElements.forEach(elem => elem.hide());
        }
        this.onFinished && this.onFinished();
    }

    static getNowTimestamp() {
        return (new Date).getTime();
    }

}