import { Team } from "./Team";

export class FinalJeopardyWagersTable {

    private readonly TABLE_FOR_OPERATOR_WINDOW: HTMLTableElement;
    private readonly TABLE_FOR_PRESENTATION_WINDOW: HTMLTableElement;

    /** Table cells for the wager values in the presentation window. Index is the team index. */
    private readonly WAGER_CELLS_IN_PRESENTATION_WINDOW: HTMLTableCellElement[] = [];

    /** Table cells for correct/incorrect symbol in the presentation window. Index is the team index. */
    private readonly RIGHT_OR_WRONG_ICON_IN_PRESENTATION_WINDOW: HTMLTableCellElement[] = [];

    /**
     * The Map key is the table element (in either operator or presentation window).
     * The Map value is an array of table cells to show the team's money with the wager result. The index is the team index.
     */
    private readonly MONEY_AFTER_CELLS: Map<HTMLTableElement, HTMLTableCellElement[]>;

    public constructor(teamArray: Team[]) {

        this.TABLE_FOR_OPERATOR_WINDOW = document.createElement("table");
        this.TABLE_FOR_PRESENTATION_WINDOW = document.createElement("table");
        this.MONEY_AFTER_CELLS = new Map();

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

        ///////////////////////////////////////////////////////////////////
        //////////// Create table for presentation window /////////////////
        ///////////////////////////////////////////////////////////////////

        this.TABLE_FOR_PRESENTATION_WINDOW.append(createTableHeaderRow());
        this.TABLE_FOR_PRESENTATION_WINDOW.id = "final-jeopardy-wagers";
        this.MONEY_AFTER_CELLS.set(this.TABLE_FOR_PRESENTATION_WINDOW, []);

        teamArray.forEach(teamObj => {
            const tableRow = document.createElement("tr");

            tableRow.append(createTableCell(teamObj.getTeamName()));
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

        ///////////////////////////////////////////////////////////////////
        ////////////// Create table for operator window ///////////////////
        ///////////////////////////////////////////////////////////////////

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
            inputWager.addEventListener("focus", () => inputWager.select());

            let wager = NaN;

            // The input event fires on every keystroke
            inputWager.addEventListener("input", () => {
                const wagerNumber = Number(inputWager.value);
                if (!isNaN(wagerNumber) && wagerNumber >= 0) {
                    this.WAGER_CELLS_IN_PRESENTATION_WINDOW[teamIndex].innerText = `$${wagerNumber.toLocaleString()}`;
                    wager = wagerNumber;
                    updateMoneyAfter();
                }
            });

            tableRow.append(createTableCell(inputWager, "money"));

            const iconRight = "✅";
            const iconWrong = "❌";

            const labelToggleSwitch = document.createElement("label");
            labelToggleSwitch.className = "toggle-switch";

            const inputCheckboxRightOrWrong = document.createElement("input");
            inputCheckboxRightOrWrong.type = "checkbox";
            inputCheckboxRightOrWrong.indeterminate = true;

            const updateMoneyAfter = (): void => {
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

            const updateMoneyAndPresentationIcons = (): void => {
                this.RIGHT_OR_WRONG_ICON_IN_PRESENTATION_WINDOW[teamIndex].innerText =
                    inputCheckboxRightOrWrong.checked ? iconRight : iconWrong;
                updateMoneyAfter();

            };

            inputCheckboxRightOrWrong.addEventListener("input", updateMoneyAndPresentationIcons);

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
                updateMoneyAndPresentationIcons();
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
                updateMoneyAndPresentationIcons();
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