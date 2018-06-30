class Team {

    constructor(teamIdx) {
        this.teamIdx = teamIdx;
        this.dollars = 0;
        this.teamName = "team " + teamIdx;
        this.isAnswering = false;
        this.hasAnswered = false;
        this.isBuzzerOpen = false;

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
        this.div.presentation.dollars = divPresentationWrapper.find(".team-dollars").html("$" + this.dollars);
        this.div.presentation.teamName = divPresentationWrapper.find(".team-name").html(this.teamName);
    }

    setDivOperator(divOperatorWrapper) {
        this.div.operator.wrapper = divOperatorWrapper;
        this.div.operator.teamName = divOperatorWrapper.find(".team-name").html(this.teamName);
        this.div.operator.dollars = divOperatorWrapper.find(".team-dollars").html("$" + this.dollars);
        this.div.operator.state = divOperatorWrapper.find(".team-state").html("Initialized.");
    }

    setTeamName(teamName) {
        this.teamName = teamName;
        this.div.operator.teamName.html(teamName);
        this.div.presentation.teamName.html(teamName);
    }

    displayBuzz() {
        this.div.operator.state.html("answering");
        this.div.operator.wrapper.css("background-color", "orange");
        this.div.presentation.wrapper.css("background-color", "orange");
    }

    setBuzzerOpen(isOpen) {
        this.isBuzzerOpen = isOpen;
        this.div.presentation.wrapper.toggleClass("buzzer-closed", !isOpen);
        this.div.operator.state.html("buzzer " + (isOpen ? "open" : "closed"));
    }

}