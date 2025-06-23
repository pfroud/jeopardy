import { Team } from "./Team";

export class FinalJeopardyTable {


    private readonly TABLE_FOR_OPERATOR_WINDOW;
    private readonly TABLE_FOR_PRESENTATION_WINDOW;

    /** Index is the team index */
    private readonly WAGER_IN_PRESENTATION_WINDOW: HTMLTableCellElement[] = [];
    private readonly CORRECT_IN_PRESENTATION_WINDOW: HTMLTableCellElement[] = [];
    private readonly MONEY_AFTER: Map<HTMLTableElement, HTMLTableCellElement[]>;

    public constructor(teamArray: Team[]) {

        this.TABLE_FOR_OPERATOR_WINDOW = document.createElement("table");
        this.TABLE_FOR_PRESENTATION_WINDOW = document.createElement("table");


        this.MONEY_AFTER = new Map();


        function createCell(contents: Node | string, className?: string): HTMLTableCellElement {
            const rv = document.createElement("td");
            rv.append(contents);
            if (className) {
                rv.className = className;
            }
            return rv;
        }

        function getHeaderRow(): HTMLTableRowElement {
            const rowHeader = document.createElement("tr");
            rowHeader.append(createCell(""));
            rowHeader.append(createCell("Before"));
            rowHeader.append(createCell("Wager"));
            rowHeader.append(createCell("Correct?"));
            rowHeader.append(createCell("After"));
            return rowHeader;
        }

        /*
           I think we need to create both tables first before adding event listeners.

           The things i want to update on the presentation window are:
               - wager from text field
               - correct y/n from checkbox
               - money after from arithmetic

           Put IDs on everything, then call a function on the operator table only which selects elements by ID then adds event listeners.

           */

        this.MONEY_AFTER.set(this.TABLE_FOR_PRESENTATION_WINDOW, []);

        this.TABLE_FOR_PRESENTATION_WINDOW.append(getHeaderRow());
        this.TABLE_FOR_PRESENTATION_WINDOW.id = "final-jeopardy-wagers";
        teamArray.forEach(teamObj => {
            const rowTeam = document.createElement("tr");

            rowTeam.append(createCell(teamObj.getTeamName()));
            rowTeam.append(createCell(`$${teamObj.getMoney().toLocaleString()}`, "money"));

            const cellWager = createCell("", "money");
            this.WAGER_IN_PRESENTATION_WINDOW.push(cellWager);
            rowTeam.append(cellWager);

            const cellCorrect = createCell("");
            this.CORRECT_IN_PRESENTATION_WINDOW.push(cellCorrect);
            rowTeam.append(cellCorrect);

            const cellMoneyAfter = createCell("", "money");
            this.MONEY_AFTER.get(this.TABLE_FOR_PRESENTATION_WINDOW)?.push(cellMoneyAfter);
            rowTeam.append(cellMoneyAfter);

            this.TABLE_FOR_PRESENTATION_WINDOW.append(rowTeam);
        });

        //////////////////////////////////////////////////////////////////////////////////

        this.MONEY_AFTER.set(this.TABLE_FOR_OPERATOR_WINDOW, []);

        this.TABLE_FOR_OPERATOR_WINDOW.id = "final-jeopardy-wagers";

        this.TABLE_FOR_OPERATOR_WINDOW.append(getHeaderRow());

        for (let teamIndex = 0; teamIndex < teamArray.length; teamIndex++) {

            const teamObj = teamArray[teamIndex];

            const moneyBefore = teamObj.getMoney();

            const rowTeam = document.createElement("tr");
            rowTeam.append(createCell(teamObj.getTeamName()));
            rowTeam.append(createCell(`$${moneyBefore.toLocaleString()}`, "money"));


            const inputWager = document.createElement("input");
            inputWager.type = "text";
            let wager = NaN;

            // Fires on every keystroke
            inputWager.addEventListener("input", () => {
                const number = Number(inputWager.value);
                if (!isNaN(number) && number >= 0) {
                    this.WAGER_IN_PRESENTATION_WINDOW[teamIndex].innerText = `$${number.toLocaleString()}`;
                    wager = number;
                    updateMoneyAfter();
                }
            });

            inputWager.addEventListener("focus", () => inputWager.select());

            inputWager.size = 6;
            rowTeam.append(createCell(inputWager, "money"));

            const inputCorrect = document.createElement("input");
            inputCorrect.type = "checkbox";
            inputCorrect.indeterminate = true;

            const updateMoneyAfter = (): void => {
                if (!isNaN(wager) && !inputCorrect.indeterminate) {
                    let newValue;
                    if (inputCorrect.checked) {
                        newValue = moneyBefore + wager;
                    } else {
                        newValue = moneyBefore - wager;
                    }

                    this.MONEY_AFTER.forEach(moneyAfterCells => moneyAfterCells[teamIndex].innerText = `$${newValue.toLocaleString()}`);
                }
            };

            inputCorrect.addEventListener("change", () => {
                this.CORRECT_IN_PRESENTATION_WINDOW[teamIndex].innerText = inputCorrect.checked ? "✅" : "❌";
                updateMoneyAfter();
            });

            rowTeam.append(createCell(inputCorrect));

            const cellMoneyAfter = createCell("", "money");
            this.MONEY_AFTER.get(this.TABLE_FOR_OPERATOR_WINDOW)?.push(cellMoneyAfter);
            rowTeam.append(cellMoneyAfter);

            this.TABLE_FOR_OPERATOR_WINDOW.append(rowTeam);

        }



    }

    public getTableForOperatorWindow(): HTMLTableElement {
        return this.TABLE_FOR_OPERATOR_WINDOW;
    }

    public getTableForPresentationWindow(): HTMLTableElement {
        return this.TABLE_FOR_PRESENTATION_WINDOW;
    }
}