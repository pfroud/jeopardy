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
        this.isRunning = false;

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
        if (this.isRunning) {
            window.clearInterval(this.intervalID);
            this.onPause && this.onPause();
            this.isRunning = false;
        }
    }

    resume() {
        if (!this.isRunning) {
            this.onResume & this.onResume();
            this.isRunning = true;
            this.intervalID = window.setInterval(this._intervalHandler, this.intervalMs);
        }
    }

    reset() {
        this.onReset && this.onReset();
        this.isRunning = false;
        this.remainingMs = this.durationMs;
        window.clearInterval(this.intervalID);
        this.textElement && this.textElement.html(this.remainingMs + ".0");
    }

    start() {
        if (!this.isRunning) {
            this.onStart && this.onStart();
            this.isRunning = true;

            this.progressElement && this.progressElement.attr("max", this.durationMs * this.intervalMs);

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
            instance.isRunning = false;
            instance.textElement.html("done");
            window.clearInterval(instance.intervalID);
            instance.onFinished && instance.onFinished();
        }
    }

}