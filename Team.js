class Team {

    constructor(teamIdx) {
        this.teamIdx = teamIdx;
        this.dollars = 0;
        this.teamName = "team " + teamIdx;
        this.isAnswering = false;
        this.hasAnswered = false; // TODO probably rename this `hasAnsweredThisRound`
        this.isBuzzerOpen = false;
        this.isLockedOut = false;

        this.operatorProgress = null; //TODO give this a better name
        this.presentationCountdownDots = null;

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
                teamName: null
            }
        };
    }

    moneyAdd(amount) {
        this.dollars += amount;
        this._updateDollarsDisplay();
    }

    moneySubtract(amount) {
        this.dollars -= amount;
        this._updateDollarsDisplay();
    }

    _updateDollarsDisplay() {
        this.div.presentation.dollars.html("$" + this.dollars);
        this.div.operator.dollars.html("$" + this.dollars);
    }

    setDivPresentation(divPresentationWrapper) {
        this.div.presentation.wrapper = divPresentationWrapper;
        this.div.presentation.dollars = divPresentationWrapper.find("div.team-dollars").html("$" + this.dollars);
        this.div.presentation.teamName = divPresentationWrapper.find("div.team-name").html(this.teamName);
        this.presentationCountdownDots = divPresentationWrapper.find("table.countdown-dots");
    }

    setDivOperator(divOperatorWrapper) {
        this.div.operator.wrapper = divOperatorWrapper;
        this.div.operator.teamName = divOperatorWrapper.find("div.team-name").html(this.teamName);
        this.div.operator.dollars = divOperatorWrapper.find("div.team-dollars").html("$" + this.dollars);
        this.div.operator.state = divOperatorWrapper.find("div.team-state").html("Initialized.");
        this.operatorProgress = divOperatorWrapper.find("progress.time-left");
    }

    setTeamName(teamName) {
        this.teamName = teamName;
        this.div.operator.teamName.html(teamName);
        this.div.presentation.teamName.html(teamName);
    }

    setIsAnswering(isAnswering) {
        this.hasAnswered = true;
        this.div.operator.state.html(isAnswering ? "answering" : "not answering");
        this.div.operator.wrapper.toggleClass("answering", isAnswering);
    }

    setBuzzerOpen(isOpen) {
        this.isBuzzerOpen = isOpen;
        this.div.presentation.wrapper.toggleClass("buzzer-closed", !isOpen);
        this.div.operator.state.html("buzzer " + (isOpen ? "open" : "closed"));
    }
    
    setLockout(isLocked) {
        this.isLockedOut = isLocked;
        this.isBuzzerOpen = !isLocked;
        this.div.presentation.wrapper.toggleClass("buzzer-closed", isLocked);
        this.div.operator.state.html(isLocked ? "lockout!" : "buzzer open");
    }

    buzzerTestShow() {
        this.presentationCountdownDots.find("td").addClass("active");
        this.div.operator.state.html("down");
    }

    buzzerTestHide() {
        this.presentationCountdownDots.find("td").removeClass("active");
        this.div.operator.state.html("up");
    }
    
    /* 
    dumpJson(){
        return {};
    }
    
    parseJson(jsonObj) {
        
    }
    */


}