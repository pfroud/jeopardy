class Team {

    constructor(teamIdx) {
        this.teamIdx = teamIdx;
        this.dollars = 0;
        this.teamName = "team " + teamIdx;
        this.isAnswering = false;
        this.hasAnswered = false;
        this.isBuzzerOpen = false;

        this.operatorProgress = null;
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
        this.div.operator.state.html(isAnswering ? "answering" : "");
        this.div.operator.wrapper.css("background-color", isAnswering ? "orange" : "");
        this.div.presentation.wrapper.css("background-color", isAnswering ? "orange" : "");
    }

    setBuzzerOpen(isOpen) {
        this.isBuzzerOpen = isOpen;
        this.div.presentation.wrapper.toggleClass("buzzer-closed", !isOpen);
        this.div.operator.state.html("buzzer " + (isOpen ? "open" : "closed"));
    }

}