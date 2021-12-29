import { Team } from "../Team";

$(document).ready(function () {
    if (!window.opener) {
        console.error("no window.opener");
        return;
    }

    const teamArray: Team[] = window.opener.operator.teamArray;


    //////////// populate the table //////////////
    const table = $("table tbody");
    for (let teamIndex = 0; teamIndex < 4; teamIndex++) {
        makeTableRow(teamIndex);
    }

    function makeTableRow(teamIndex: number): void {
        const teamObj = teamArray[teamIndex];
        const dollarValues = [1000, 800, 600, 400, 200];

        const tableRow = $("<tr>").appendTo(table);

        // cell in first column contains the team name
        $("<td>")
            .addClass("team-name")
            .html(teamObj.teamName)
            .appendTo(tableRow);

        const textInput: JQuery<HTMLInputElement> = $<HTMLInputElement>("<input>")
            .attr("type", "text")
            .prop("value", teamObj.dollars)
            .on("input", function () {
                teamObj.moneySet(Number(textInput.prop("value")));
            });

        // create buttons to subtract money
        dollarValues.forEach(function (dollarValue) {
            const tdMoneySubtract = $("<td>").appendTo(tableRow);
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
        const tdPresentValue = $("<td>")
            .appendTo(tableRow)
            .addClass("present-value");
        tdPresentValue.append(document.createTextNode("$"));
        textInput.appendTo(tdPresentValue);


        // create buttons to add money
        dollarValues.reverse();
        dollarValues.forEach(function (dollarValue) {
            const tdMoneyAdd = $("<td>").appendTo(tableRow);
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