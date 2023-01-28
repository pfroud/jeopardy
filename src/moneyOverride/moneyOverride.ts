import { Operator } from "../operator/Operator";
import { Team } from "../Team";

document.addEventListener("DOMContentLoaded", function () {
    if (!window.opener) {
        document.body.innerHTML = "no window.opener";
        return;
    }

    window.opener.addEventListener("unload", () => close());

    const operator = ((window.opener as any).operator as Operator);
    if (!operator) {
        document.body.innerHTML = "no window.opener.operator";
        return;
    }

    const teamArray: Team[] = operator.getTeamArray();

    const table = document.querySelector("table tbody");
    for (let teamIndex = 0; teamIndex < Operator.teamCount; teamIndex++) {
        createTableRow(teamIndex);
    }

    function createTableRow(teamIndex: number): void {
        const team = teamArray[teamIndex];
        const dollarValues = [1000, 800, 600, 500, 400, 300, 200, 100, 50];

        const tableRow = document.createElement("tr");
        table.appendChild(tableRow);

        // create text showing the team name
        const tdTeamName = document.createElement("td");
        tdTeamName.classList.add("team-name");
        tdTeamName.innerHTML = team.teamName;
        tableRow.appendChild(tdTeamName);

        // create text input field
        const textInput = document.createElement("input");
        textInput.setAttribute("type", "text");
        textInput.value = String(team.getMoney());
        textInput.addEventListener("input", function () {
            team.moneySet(Number(textInput.value), false);
        });

        // create buttons to subtract money
        dollarValues.forEach(function (dollarValue) {
            const cell = document.createElement("td");
            tableRow.appendChild(cell);

            const button = document.createElement("button");
            button.classList.add("money-change");
            button.innerHTML = "-$" + dollarValue;
            button.addEventListener("click", () => {
                team.moneySubtract(dollarValue, false);
                textInput.value = String(team.getMoney());
            });
            cell.appendChild(button);
        });

        // add text input field to the table
        const tdPresentValue = document.createElement("td");
        tdPresentValue.classList.add("present-value");
        tdPresentValue.append(document.createTextNode("$"));
        tdPresentValue.appendChild(textInput);
        tableRow.appendChild(tdPresentValue);

        // create buttons to add money
        dollarValues.reverse();
        dollarValues.forEach(function (dollarValue) {
            const cell = document.createElement("td");
            tableRow.appendChild(cell);

            const button = document.createElement("button");
            button.classList.add("money-change");
            button.innerHTML = "+$" + dollarValue;
            button.addEventListener("click", () => {
                team.moneyAdd(dollarValue, false);
                textInput.value = String(team.getMoney());
            });
            cell.appendChild(button);
        });

    }

});