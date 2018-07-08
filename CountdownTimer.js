"use strict";

class CountdownTimer {

    constructor(durationMs) {
        if (!durationMs) {
            console.error("duration is required");
            return;
        }
        this.intervalMs = 100;
        this.durationMs = durationMs;
        this.remainingMs = durationMs;
        this.intervalID = null;
        this.hasStarted = false;
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

    pause() {
        if (this.hasStarted && !this.isPaused) {
            window.clearInterval(this.intervalID);
            this.onPause && this.onPause();
            this.isPaused = true;
            this.progressElement && this.progressElement.addClass("paused");
        }
    }

    togglePaused() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    resume() {
        if (this.hasStarted && this.isPaused) {
            this.onResume && this.onResume();
            this.isPaused = false;
            this.intervalID = window.setInterval(this._intervalHandler, this.intervalMs, this);
            this.progressElement && this.progressElement.removeClass("paused");
        }
    }

    reset() {
        this.onReset && this.onReset();
        this.hasStarted = false;
        this.remainingMs = this.durationMs;
        window.clearInterval(this.intervalID);
        this.textElement && this.textElement.html(this.remainingMs + ".0");
    }

    cancel() {
        this.isRunning = false;
        window.clearInterval(this.intervalID);
        this.progressElement && this.progressElement.css("display", "none");
    }

    start() {
        if (!this.hasStarted) {
            this.onStart && this.onStart();
            this.hasStarted = true;

            if (this.progressElement) {
                var numTicks = this.durationMs * this.intervalMs;
                this.progressElement.attr("max", numTicks).attr("value", numTicks).css("display", "");
            }

            this.intervalID = window.setInterval(this._intervalHandler, this.intervalMs, this);

            if (this.dotsElement) {
                var tds = this.dotsElement.find("td");
                var len = tds.length;
                if (len !== len) {
                    console.warn("found " + len + "dots element(s), expected exactly 9");
                }
                tds.css("background-color", "red");
            }
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
        this.isRunning = false;
        this.textElement && this.textElement.html("done");
        window.clearInterval(this.intervalID);
        this.progressElement && this.progressElement.css("display", "none");

        this.onFinished && this.onFinished();


    }

}