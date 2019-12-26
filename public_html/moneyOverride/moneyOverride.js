$(document).ready(function () {
    if (!window.opener) {
        console.error("no window.opener");
        return;
    }

    const teamArray = window.opener.operator.teamArray;


    //////////// populate the table //////////////
    const table = $("table tbody");
    for (let teamIndex = 0; teamIndex < 4; teamIndex++) {
        makeTableRow(teamIndex);
    }

    function makeTableRow(teamIndex) {
        const teamObj = teamArray[teamIndex];
        var dollarValues = [1000, 800, 600, 400, 200];

        const tr = $("<tr>").appendTo(table);

        // cell in first column contains the team name
        $("<td>")
                .addClass("team-name")
                .html(teamObj.teamName)
                .appendTo(tr);

        var textInput;

        // add buttons to subtract money
        dollarValues.forEach(function (dollarValue) {
            const tdMoneySubtract = $("<td>").appendTo(tr);
            $("<button>")
                    .addClass("money-change")
                    .html("-$" + dollarValue)
                    .appendTo(tdMoneySubtract)
                    .on("click", () => {
                        teamObj.moneySubtract(dollarValue);
                        textInput.prop("value", teamObj.dollars);
                    });
        });

        // cell to show the current dollar amount
        const td = $("<td>")
                .appendTo(tr)
                .addClass("present-value");
        td.append(document.createTextNode("$"));
        textInput = $("<input>")
                .attr("type", "text")
                .prop("value", teamObj.dollars)
                .appendTo(td)
                .on("input", function () {
                    teamObj.moneySet(Number(this.value));
                });

        // buttons to add money
        dollarValues.reverse();
        dollarValues.forEach(function (dollarValue) {
            const tdMoneyAdd = $("<td>").appendTo(tr);
            $("<button>")
                    .addClass("money-change")
                    .html("+$" + dollarValue)
                    .appendTo(tdMoneyAdd)
                    .on("click", () => {
                        teamObj.moneyAdd(dollarValue);
                        textInput.prop("value", teamObj.dollars);
                    });
        });

    }




});