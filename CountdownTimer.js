"use strict";

class CountdownTimer {

    constructor(durationMs) {
        if (!durationMs) {
            console.error("duration is required");
            return;
        }

        this.intervalMs = 100;

        if (durationMs % intervalMs !== 0) {
            console.warn("CountdownTimer implementation is pretty shitty and expects duration to be multiple of 100");
        }

        this.durationMs = durationMs;
        this.remainingMs = durationMs;

        this.intervalID = null; //from window.setInterval()

        this.hasStarted = false;
        this.hasFinished = false;
        this.isPaused = false;

        // events
        this.onStart = null;
        this.onPause = null;
        this.onResume = null;
        this.onReset = null;
        this.onFinished = null;
        this.onTick = null;

        // display elements
        this.textElement = null;
        this.progressElement = null;
        this.dotsElement = null;
    }

    togglePaused() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    pause() {
        if (this.hasStarted && !this.hasFinished && !this.isPaused) {
            window.clearInterval(this.intervalID); //actually pauses at next 100ms interval
            this.onPause && this.onPause();
            this.isPaused = true;
            this.progressElement && this.progressElement.addClass("paused");
        }
    }

    resume() {
        if (this.hasStarted && !this.hasFinished && this.isPaused) {
            this.intervalID = window.setInterval(this._intervalHandler, this.intervalMs, this);
            this.onResume && this.onResume();
            this.isPaused = false;
            this.progressElement && this.progressElement.removeClass("paused");
        }
    }

    reset() {
        this.onReset && this.onReset();
        this.hasStarted = false;
        this.hasFinished = false;
        this.remainingMs = this.durationMs;
        window.clearInterval(this.intervalID);
        this.textElement && this.textElement.html(this.remainingMs + ".0");
    }

    start() {
        if (!this.hasStarted && !this.hasFinished) {
            this.onStart && this.onStart();
            this.hasStarted = true;

            if (this.progressElement) {
                var numTicks = this.durationMs * this.intervalMs;
                this.progressElement.attr("max", numTicks).attr("value", numTicks).show();
            }

            if (this.dotsElement) {
                var tds = this.dotsElement.find("td");
                if (tds.length !== 9) {
                    console.warn("found " + tds.length + "dot(s) element(s), expected exactly 9");
                }
                tds.css("background-color", "red");
            }

            this.intervalID = window.setInterval(this._intervalHandler, this.intervalMs, this);
        }
    }

    _intervalHandler(instance) {
        instance.remainingMs -= instance.intervalMs;

        instance.onTick && instance.onTick();

        if (instance.textElement) {
            var secondsRoundedDown = Math.floor(instance.remainingMs / 1000);
            var tenthSeconds = (instance.remainingMs % 1000) / 100;
            instance.textElement.html(secondsRoundedDown + "." + tenthSeconds);
        }

        if (instance.progressElement) {
            instance.progressElement.attr("value", instance.remainingMs * instance.intervalMs);
        }

        if (instance.dotsElement && instance.remainingMs % 1000 === 0) {
            var secondsThatJustPassed = (instance.remainingMs / 1000) + 1;
            instance.dotsElement.find('[data-countdown="' + secondsThatJustPassed + '"]').css("background-color", "");
        }

        if (instance.remainingMs <= 0) {
            instance._finish();
        }
    }

    _finish() {
        this.hasFinished = true;
        this.textElement && this.textElement.html("done");
        window.clearInterval(this.intervalID);
        this.progressElement && this.progressElement.hide();
        this.onFinished && this.onFinished();
    }

}