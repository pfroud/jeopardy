import { querySelectorAndCheck } from "../commonFunctions";
import { Operator } from "../operator/Operator";

document.addEventListener("DOMContentLoaded", function () {

    if (!window.opener) {
        document.body.innerHTML = "no window.opener";
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
    const operator = (window.opener as any).operator as Operator;
    if (!operator) {
        document.body.innerHTML = "no window.opener.operator";
        return;
    }

    // Automatically close the money-override window when the operator window closes.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    window.opener.addEventListener("unload", () => close());

    const teamArray = operator.getTeamArray();

    const table = querySelectorAndCheck(document, "table tbody");
    for (let teamIndex = 0; teamIndex < operator.teamCount; teamIndex++) {
        createTableRow(teamIndex);
    }

    function createTableRow(teamIndex: number): void {
        if (!teamArray) {
            throw new Error("called createTableRow() when teamArray is undefined");
        }
        const team = teamArray[teamIndex];
        const dollarValues = [1000, 800, 600, 500, 400, 300, 200, 100, 50];

        const tableRowForTeam = document.createElement("tr");
        table.append(tableRowForTeam);

        // create text showing the team name
        const tdTeamName = document.createElement("td");
        tdTeamName.classList.add("team-name");
        tdTeamName.innerHTML = team.getTeamName();
        tableRowForTeam.append(tdTeamName);

        // create buttons to subtract money
        dollarValues.forEach(function (dollarValue) {
            const tableCellSubtractMoney = document.createElement("td");
            tableRowForTeam.append(tableCellSubtractMoney);

            const buttonSubtractMoney = document.createElement("button");
            buttonSubtractMoney.classList.add("money-change");
            buttonSubtractMoney.innerHTML = `-$${dollarValue}`;
            buttonSubtractMoney.addEventListener("click", () => {
                team.moneySubtract(dollarValue, false);
                textInput.value = String(team.getMoney());
            });
            tableCellSubtractMoney.append(buttonSubtractMoney);
        });

        // create text input field to type in a dollar value
        const tableCellPresentValue = document.createElement("td");
        tableCellPresentValue.classList.add("present-value");
        tableCellPresentValue.append(document.createTextNode("$"));
        const textInput = document.createElement("input");
        textInput.setAttribute("type", "text");
        textInput.value = String(team.getMoney());
        textInput.addEventListener("input", function () {
            team.moneySet(Number(textInput.value), false);
        });
        tableCellPresentValue.append(textInput);
        tableRowForTeam.append(tableCellPresentValue);

        // create buttons to add money
        dollarValues.reverse();
        dollarValues.forEach(function (dollarValue) {
            const tableCellAddMoney = document.createElement("td");
            tableRowForTeam.append(tableCellAddMoney);

            const buttonAddMoney = document.createElement("button");
            buttonAddMoney.classList.add("money-change");
            buttonAddMoney.innerHTML = `+$${dollarValue}`;
            buttonAddMoney.addEventListener("click", () => {
                team.moneyAdd(dollarValue, false);
                textInput.value = String(team.getMoney());
            });
            tableCellAddMoney.append(buttonAddMoney);
        });

    }

});