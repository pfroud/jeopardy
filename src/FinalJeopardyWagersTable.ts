import { Team } from "./Team";

export class FinalJeopardyWagersTable {

    private readonly TABLE_FOR_OPERATOR_WINDOW: HTMLTableElement;
    private readonly TABLE_FOR_PRESENTATION_WINDOW: HTMLTableElement;

    /** Table cells for the wager values in the presentation window. Index is the team index. */
    private readonly WAGER_CELLS_IN_PRESENTATION_WINDOW: HTMLTableCellElement[] = [];

    /** Table cells for correct/incorrect symbol in the presentation window. Index is the team index. */
    private readonly CORRECT_IN_PRESENTATION_WINDOW: HTMLTableCellElement[] = [];

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

            const cellCorrect = createTableCell("");
            this.CORRECT_IN_PRESENTATION_WINDOW.push(cellCorrect);
            tableRow.append(cellCorrect);

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

            const checkboxCorrect = document.createElement("input");
            checkboxCorrect.type = "checkbox";
            checkboxCorrect.indeterminate = true;

            const updateMoneyAfter = (): void => {
                if (!isNaN(wager) && !checkboxCorrect.indeterminate) {
                    let newValue;
                    if (checkboxCorrect.checked) {
                        newValue = moneyBefore + wager;
                    } else {
                        newValue = moneyBefore - wager;
                    }
                    this.MONEY_AFTER_CELLS.forEach(moneyAfterCells =>
                        moneyAfterCells[teamIndex].innerText = `$${newValue.toLocaleString()}`);
                }
            };

            checkboxCorrect.addEventListener("change", () => {
                this.CORRECT_IN_PRESENTATION_WINDOW[teamIndex].innerText = checkboxCorrect.checked ? "✅" : "❌";
                updateMoneyAfter();
            });

            tableRow.append(createTableCell(checkboxCorrect));

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