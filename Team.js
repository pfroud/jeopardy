class Team {

    constructor(teamNumber) {
        this.teamNumber = teamNumber;
        this.dollars = 0;
        this.teamName = null;
        this.isAnswering = false;
        this.hasAnswered = false;
        this.displayDiv = null;

        this.operatorDiv = null;
        //todo add stasictics
    }

    setDisplayDiv(displayDiv) {
        this.displayDiv = displayDiv;
        this.teamName && displayDiv.find(".team-name").html(this.teamName);
        displayDiv.find(".team-dollars").html("$" + this.dollars);
    }

    setOperatorDiv(operatorDiv) {
        this.operatorDiv = operatorDiv;
        this.teamName && operatorDiv.find(".team-name").html(this.teamName);
        operatorDiv.find(".team-dollars").html("$" + this.dollars);
        operatorDiv.find(".team-state").html("initialized");
    }

    setTeamName(teamName) {
        this.teamName = teamName;
        this.displayDiv && this.displayDiv.find(".team-name").html(teamName);
        this.operatorDiv && this.operatorDiv.find(".team-name").html(teamName);
    }

    displayBuzz() {
        this.operatorDiv.find(".team-state").html("answering");
        this.displayDiv.css("background-color", "orange");
    }

}