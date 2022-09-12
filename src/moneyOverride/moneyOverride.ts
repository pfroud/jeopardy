import { Operator } from "../operator/Operator";
import { Team } from "../Team";

document.addEventListener("DOMContentLoaded", function () {
    if (!window.opener) {
        console.error("no window.opener");

        return;
    }

    const teamArray: Team[] = ((window.opener as any).operator as Operator).getTeamArray();

    //////////// populate the table //////////////
    const table = document.querySelector("table tbody");
    for (let teamIndex = 0; teamIndex < Operator.teamCount; teamIndex++) {
        makeTableRow(teamIndex);
    }

    function makeTableRow(teamIndex: number): void {
        const teamObj = teamArray[teamIndex];
        const dollarValues = [1000, 800, 600, 500, 400, 300, 200, 100, 50];

        const tableRow = document.createElement("tr");
        table.appendChild(tableRow);

        // cell in first column contains the team name
        const tdTeamName = document.createElement("td");
        tdTeamName.classList.add("team-name");
        tdTeamName.innerHTML = teamObj.teamName;
        tableRow.appendChild(tdTeamName);

        const textInput = document.createElement("input");
        textInput.setAttribute("type", "text");
        textInput.value = String(teamObj.getDollars());
        textInput.addEventListener("input", function () {
            teamObj.moneySet(Number(textInput.value), false);
        });

        // create buttons to subtract money
        dollarValues.forEach(function (dollarValue) {
            const cell = document.createElement("td");
            tableRow.appendChild(cell);

            const button = document.createElement("button");
            button.classList.add("money-change");
            button.innerHTML = "-$" + dollarValue;
            button.addEventListener("click", () => {
                teamObj.moneySubtract(dollarValue, false);
                textInput.value = String(teamObj.getDollars());
            });
            cell.appendChild(button);
        });

        // cell to show the current dollar amount
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
                teamObj.moneyAdd(dollarValue, false);
                textInput.value = String(teamObj.getDollars());
            });
            cell.appendChild(button);
        });

    }




});