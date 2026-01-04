import { Team } from "./Team";

/*

This class creates and manages an HTML table which look like this: (but with a row for each team)
|-------+--------+-------+----------+-------|
|       | Before | Wager | Correct? | After |
|-------+--------+-------+----------+-------|
|Team 1 |        |       |          |       |
|-------+--------+-------+----------+-------|

The "before" column has the team's money before Final Jeopardy.
The "wager" column has how much they wagered.
The "correct" column has an icon showing whether the team answered correctly.
The "after" column has the result or adding or subtracting the wager.
*/
export class FinalJeopardyWagersTable {

    private readonly TABLE_FOR_OPERATOR_WINDOW: HTMLTableElement;
    private readonly TABLE_FOR_PRESENTATION_WINDOW: HTMLTableElement;

    /** Table cells containing text fields for the wager values in the presentation window. Array index is the team index. */
    private readonly WAGER_CELLS_IN_PRESENTATION_WINDOW: HTMLTableCellElement[] = [];

    /** Table cells for correct/incorrect symbol in the presentation window. Array index is the team index. */
    private readonly RIGHT_OR_WRONG_ICON_IN_PRESENTATION_WINDOW: HTMLTableCellElement[] = [];

    /**
     * Cells which show how much money each team has after adding or subtracting the wager.
     * 
     * The Map key is the <table> element in either the operator window or the presentation window.
     * The Map value is an array of table cells displaying the team's money after adding or
     * subtracting the wager. The array index is the team index.
     */
    private readonly MONEY_AFTER_CELLS = new Map<HTMLTableElement, HTMLTableCellElement[]>();

    public constructor(teamArray: Team[]) {

        function createTableCell(contents: Node | string, className?: string): HTMLTableCellElement {
            const rv = document.createElement("td");
            rv.append(contents);
            if (className) {
                rv.className = className;
            }
            return rv;
        }

        function createTableHeaderRow(): HTMLTableRowElement {
            const rowHeader = document.createElement("tr");
            rowHeader.append(createTableCell(""));
            rowHeader.append(createTableCell("Before"));
            rowHeader.append(createTableCell("Wager"));
            rowHeader.append(createTableCell("Correct?"));
            rowHeader.append(createTableCell("After"));
            return rowHeader;
        }

        ////////////////////////////////////////////////////////////////////////////////
        //////////// Create and populate table for presentation window /////////////////
        ////////////////////////////////////////////////////////////////////////////////
        this.TABLE_FOR_PRESENTATION_WINDOW = document.createElement("table");
        this.TABLE_FOR_PRESENTATION_WINDOW.id = "final-jeopardy-wagers";
        this.TABLE_FOR_PRESENTATION_WINDOW.append(createTableHeaderRow());
        this.MONEY_AFTER_CELLS.set(this.TABLE_FOR_PRESENTATION_WINDOW, []);

        teamArray.forEach(teamObj => {
            const tableRow = document.createElement("tr");

            tableRow.append(createTableCell(teamObj.getTeamName()));

            // money before Final Jeopardy
            tableRow.append(createTableCell(`$${teamObj.getMoney().toLocaleString()}`, "money"));

            const cellWager = createTableCell("", "money");
            this.WAGER_CELLS_IN_PRESENTATION_WINDOW.push(cellWager);
            tableRow.append(cellWager);

            const cellRightOrWrongIcon = createTableCell("");
            this.RIGHT_OR_WRONG_ICON_IN_PRESENTATION_WINDOW.push(cellRightOrWrongIcon);
            tableRow.append(cellRightOrWrongIcon);

            const cellMoneyAfter = createTableCell("", "money");
            this.MONEY_AFTER_CELLS.get(this.TABLE_FOR_PRESENTATION_WINDOW)?.push(cellMoneyAfter);
            tableRow.append(cellMoneyAfter);

            this.TABLE_FOR_PRESENTATION_WINDOW.append(tableRow);
        });

        ////////////////////////////////////////////////////////////////////////////////
        ////////////// Create and populate table for operator window ///////////////////
        ////////////////////////////////////////////////////////////////////////////////
        this.TABLE_FOR_OPERATOR_WINDOW = document.createElement("table");
        this.TABLE_FOR_OPERATOR_WINDOW.id = "final-jeopardy-wagers";
        this.TABLE_FOR_OPERATOR_WINDOW.append(createTableHeaderRow());
        this.MONEY_AFTER_CELLS.set(this.TABLE_FOR_OPERATOR_WINDOW, []);

        for (let teamIndex = 0; teamIndex < teamArray.length; teamIndex++) {

            const teamObj = teamArray[teamIndex];
            const moneyBefore = teamObj.getMoney();

            const tableRow = document.createElement("tr");
            tableRow.append(createTableCell(teamObj.getTeamName()));
            tableRow.append(createTableCell(`$${moneyBefore.toLocaleString()}`, "money"));

            const inputWager = document.createElement("input");
            inputWager.type = "text";
            inputWager.size = 6;
            inputWager.addEventListener("focus", () => inputWager.select()); //select all text in field

            let wager = NaN;

            /*
            The input event fires on every keystroke.
            As the human operator types into the wager text field in the operator window,
            also update the wager display in the presentation window.
            */
            inputWager.addEventListener("input", () => {
                const parsedWager = Number(inputWager.value);
                if (!isNaN(parsedWager) && parsedWager >= 0) {
                    this.WAGER_CELLS_IN_PRESENTATION_WINDOW[teamIndex].innerText = `$${parsedWager.toLocaleString()}`;
                    wager = parsedWager;
                    updateMoneyAfter();
                }
            });

            tableRow.append(createTableCell(inputWager, "money"));

            const iconRight = "✅";
            const iconWrong = "❌";

            /*
            Create a sliding toggle switch using a checkbox.
            Originally from
            https://www.geeksforgeeks.org/css/how-to-make-a-toggle-button-using-checkbox-and-css
            */
            const labelToggleSwitch = document.createElement("label");
            labelToggleSwitch.className = "toggle-switch";

            const inputCheckboxRightOrWrong = document.createElement("input");
            inputCheckboxRightOrWrong.type = "checkbox";
            inputCheckboxRightOrWrong.indeterminate = true;

            const updateMoneyAfter = (): void => {
                // Add or subtract the wager from the team's "before" money and populate the "after" column.
                if (!isNaN(wager) && !inputCheckboxRightOrWrong.indeterminate) {
                    let newValue;
                    if (inputCheckboxRightOrWrong.checked) {
                        newValue = moneyBefore + wager;
                    } else {
                        newValue = moneyBefore - wager;
                    }
                    this.MONEY_AFTER_CELLS.forEach(moneyAfterCells =>
                        moneyAfterCells[teamIndex].innerText = `$${newValue.toLocaleString()}`);
                }
            };

            const updateIconAndMoney = (): void => {
                this.RIGHT_OR_WRONG_ICON_IN_PRESENTATION_WINDOW[teamIndex].innerText =
                    inputCheckboxRightOrWrong.checked ? iconRight : iconWrong;
                updateMoneyAfter();
            };

            inputCheckboxRightOrWrong.addEventListener("input", updateIconAndMoney);

            labelToggleSwitch.append(inputCheckboxRightOrWrong);

            const spanToggleSwitchBackground = document.createElement("span");
            spanToggleSwitchBackground.className = "toggle-switch-background";
            labelToggleSwitch.append(spanToggleSwitchBackground);

            const cellRightOrWrong = document.createElement("td");

            const buttonWrong = document.createElement("button");
            buttonWrong.innerText = iconWrong;
            buttonWrong.className = "right-or-wrong";
            buttonWrong.id = "wrong";
            buttonWrong.addEventListener("click", () => {
                inputCheckboxRightOrWrong.indeterminate = false;
                inputCheckboxRightOrWrong.checked = false;
                updateIconAndMoney();
            });
            cellRightOrWrong.append(buttonWrong);

            cellRightOrWrong.append(labelToggleSwitch);

            const buttonRight = document.createElement("button");
            buttonRight.innerText = iconRight;
            buttonRight.className = "right-or-wrong";
            buttonRight.id = "right";
            buttonRight.addEventListener("click", () => {
                inputCheckboxRightOrWrong.indeterminate = false;
                inputCheckboxRightOrWrong.checked = true;
                updateIconAndMoney();
            });
            cellRightOrWrong.append(buttonRight);

            tableRow.append(cellRightOrWrong);

            const cellMoneyAfter = createTableCell("", "money");
            this.MONEY_AFTER_CELLS.get(this.TABLE_FOR_OPERATOR_WINDOW)?.push(cellMoneyAfter);
            tableRow.append(cellMoneyAfter);

            this.TABLE_FOR_OPERATOR_WINDOW.append(tableRow);
        }
    }

    public getTableForOperatorWindow(): HTMLTableElement {
        return this.TABLE_FOR_OPERATOR_WINDOW;
    }

    public getTableForPresentationWindow(): HTMLTableElement {
        return this.TABLE_FOR_PRESENTATION_WINDOW;
    }
}