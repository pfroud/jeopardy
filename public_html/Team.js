class Team {

    constructor(teamIdx, presentationInstance, settings, audioManager) {
        this.settings = settings;
        this.audioManager = audioManager;
        this.teamIdx = teamIdx;
        this.dollars = 0;
        this.teamName = "team " + teamIdx;

        this.state = null;

        this.div = {
            operator: {
                wrapper: null,
                dollars: null,
                teamName: null,
                state: null
            },
            presentation: {
                wrapper: null,
                dollars: null,
                teamName: null,
                buzzerShow: null
            }
        };
        this.presentationCountdownDots = null;
        this.presentationProgressLockout = null;
        this.countdownTimer = null;

        this.setDivOperator($('div[data-team-number="' + teamIdx + '"]'));
        this.setDivPresentation(presentationInstance.getTeamDiv(teamIdx));

        this.setState(Team.stateEnum.BUZZERS_OFF);
    }

    handleAnswerRight(clueObj) {
        this.audioManager.play("answerRight");
        this.moneyAdd(clueObj.value);
        this.presentationCountdownDots.find("td").removeClass("active");
    }

    handleAnswerWrong(clueObj) {
        this.audioManager.play("answerWrong");
        this.presentationCountdownDots.find("td").removeClass("active");
        this.moneySubtract(clueObj.value * this.settings.wrongAnswerPenaltyMultiplier);
        this.setState(this.settings.isAllowedMultipleTries ? Team.stateEnum.CAN_ANSWER : Team.stateEnum.ALREADY_ANSWERED);
    }

    moneyAdd(amount) {
        this.dollars += amount;
        this._updateDollarsDisplay();
    }

    moneySubtract(amount) {
        this.dollars -= amount;
        this._updateDollarsDisplay();
    }

    canBuzz() {
        return this.state === Team.stateEnum.CAN_ANSWER;
    }

    setPaused(isPaused) {
        if (this.countdownTimer) {
            if (isPaused) {
                this.countdownTimer.pause();
            } else {
                this.countdownTimer.resume();
            }
        }
    }

    _updateDollarsDisplay() {
        this.div.presentation.dollars.html("$" + this.dollars.toLocaleString());
        this.div.operator.dollars.html("$" + this.dollars.toLocaleString());
    }

    setDivPresentation(divPresentationWrapper) {
        this.div.presentation.wrapper = divPresentationWrapper;
        this.div.presentation.dollars = divPresentationWrapper.find("div.team-dollars").html("$" + this.dollars);
        this.div.presentation.teamName = divPresentationWrapper.find("div.team-name").html(this.teamName);
        this.presentationCountdownDots = divPresentationWrapper.find("table.countdown-dots");
        this.presentationProgressLockout = divPresentationWrapper.find("progress");
        this.divBuzzerShow = divPresentationWrapper.find("div.buzzer-show");
    }

    setDivOperator(divOperatorWrapper) {
        this.div.operator.wrapper = divOperatorWrapper;
        this.div.operator.teamName = divOperatorWrapper.find("div.team-name").html(this.teamName);
        this.div.operator.dollars = divOperatorWrapper.find("div.team-dollars").html("$" + this.dollars);
        this.div.operator.state = divOperatorWrapper.find("div.team-state").html(this.state);
    }

    setTeamName(teamName) {
        this.teamName = teamName;
        this.div.operator.teamName.html(teamName);
        this.div.presentation.teamName.html(teamName);
    }

    setState(targetState, endLockout) {
        if (!(Team.stateValues.includes(targetState))) {
            throw new RangeError(`team ${this.teamIdx}: can't go to state "${targetState}", not in the enum of avaliable states`);
        }

        if (this.state === Team.stateEnum.LOCKOUT && !endLockout) {
            this.stateBeforeLockout = targetState;
        } else {
            this.state = targetState;
            this.div.operator.wrapper.attr("data-team-state", targetState);
            this.div.presentation.wrapper.attr("data-team-state", targetState);
            this.div.operator.state.html(this.state);

            if (this.countdownTimer) {
                this.countdownTimer.pause();
                this.countdowmTimer = null;
            }
        }
    }

    canBeLockedOut() {
        return this.state === Team.stateEnum.READING_QUESTION;
    }

    startLockout() {
        this.stateBeforeLockout = this.state;
        this.setState(Team.stateEnum.LOCKOUT);

        var countdownShowCategory = this.countdownTimer = new CountdownTimer(this.settings.durationLockout);
        // todo would be nice to show progress element on display and presentation. need to change CountdownTimer to allow that
        countdownShowCategory.progressElements.push(this.presentationProgressLockout);
        countdownShowCategory.intervalMs = 50; //high resolution mode!!
        countdownShowCategory.hideProgressOnFinish = true;
        countdownShowCategory.onFinished = () => this.endLockout();
        countdownShowCategory.start();

    }

    endLockout() {
        this.setState(this.stateBeforeLockout, true);
        this.stateBeforeLockout = null;
        this.countdownTimer = null;
    }

    startAnswer() {
        this.setState(Team.stateEnum.ANSWERING);
        this.presentationCountdownDots.find("td").addClass("active");
    }

    showKeyDown() {
        this.divBuzzerShow.addClass("pressed").removeClass("not-pressed");
    }

    showKeyUp() {
        this.divBuzzerShow.addClass("not-pressed").removeClass("pressed");
    }

    jsonDump() {
        return {
            name: this.teamName,
            dollars: this.dollars
        };
    }

    jsonLoad(jsonObj) {
        this.teamName = jsonObj.name;
        this.dollars = jsonObj.dollars;
        
        this.div.presentation.dollars.html("$" + this.dollars);
        this.div.presentation.teamName.html(this.teamName);
        
        this.div.operator.teamName.html(this.teamName);
        this.div.operator.dollars.html("$" + this.dollars);
    }

}

Team.stateEnum = {
    BUZZERS_OFF: "buzzers-off", // game has not started
    READING_QUESTION: "reading-question", //operator is reading the question out loud
    CAN_ANSWER: "can-answer", //operator is done reading the question
    ANSWERING: "answering",
    ALREADY_ANSWERED: "already-answered",
    LOCKOUT: "lockout" //team buzzed while operator was reading the question
};
Object.freeze(Team.stateEnum);
Team.stateValues = Object.values(Team.stateEnum);
Object.freeze(Team.stateValues);