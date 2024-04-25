import { Category, Round, RoundType, ScrapedClue } from "../games";
import { Operator } from "./Operator";

/**
 * The <table>s in the operator window and presentation windows should have the exact same
 * HTML structure. So a lot of stuff has a Set<>.
 */
export class GameBoard {

    private static readonly TABLE_COLUMN_COUNT = 6;
    private static readonly TABLE_ROW_COUNT = 6;
    /** The first row is categories. */
    private static readonly TABLE_CLUE_ROW_COUNT = GameBoard.TABLE_ROW_COUNT - 1;

    /** For Double Jeopardy each number is doubled. */
    private static readonly CLUE_VALUES = [200, 400, 600, 800, 1000];
    private static readonly MULTIPLIER: { [roundType in RoundType]: number } = {
        "single": 1,
        "double": 2
    };


    private readonly TABLES = new Set<HTMLTableElement>();

    /** The Set is for the operator window and presentation window. The array is for table columns. */
    private readonly CATEGORY_CELLS = new Map<HTMLTableElement, HTMLTableCellElement[]>();

    /**
     * The Set is for the operator window and presentation window.
     * The first array index is the <tr> index.
     * The second array index is the <td> index.
     */
    private readonly CLUE_CELLS = new Map<HTMLTableElement, HTMLTableCellElement[][]>();

    private readonly OPERATOR;

    private round: Round | null = null;


    /**
     * The first array index is the row index.
     * The second array index is the column index.
     */
    private cluesIn2DArray: ScrapedClue[][] | null = null;

    /**
     * @param tables the <table> in the operator window and in the presentation window.
     */
    public constructor(operator: Operator, ...tables: HTMLTableElement[]) {
        this.OPERATOR = operator;
        tables.forEach(table => this.initializeTable(table));
    }

    private initializeTable(tableToValidate: HTMLTableElement): void {
        const trs = tableToValidate.querySelectorAll("tr");
        if (trs.length !== GameBoard.TABLE_ROW_COUNT) {
            throw new Error(`The table has ${trs.length} <tr> element(s), expected exactly ${GameBoard.TABLE_ROW_COUNT}`);
        }

        const arrayOfCluesForTr: HTMLTableCellElement[][] = [];

        trs.forEach((tr, trIndex) => {
            const tds = tr.querySelectorAll("td");
            if (tds.length !== GameBoard.TABLE_COLUMN_COUNT) {
                throw new Error(`The table row at index ${trIndex} has ${tds.length} <td> element(s), expected exactly ${GameBoard.TABLE_COLUMN_COUNT}`);
            }
            if (trIndex === 0) {
                // The first row is the categories.
                this.CATEGORY_CELLS.set(tableToValidate, Array.from(tds));
                tds.forEach((td, idx) => td.innerText = `Category ${idx + 1}`);
            } else {
                const clueRowIndex = trIndex - 1; //bc the first row is categories.
                arrayOfCluesForTr[clueRowIndex] = Array.from(tds);
                tds.forEach((td, tdIndex) => {
                    td.addEventListener("click", () => {

                        if (this.round && this.cluesIn2DArray) {
                            this.OPERATOR.gameBoardClueClicked(this.cluesIn2DArray[clueRowIndex][tdIndex]);
                        }

                    });
                    td.innerText = `Row ${trIndex}`;
                    td.classList.add("avail");
                });

            }
        });
        this.CLUE_CELLS.set(tableToValidate, arrayOfCluesForTr);
    }

    public setRound(round: Round): void {
        this.round = round;

        this.cluesIn2DArray = [];
        for (let i = 0; i < GameBoard.TABLE_CLUE_ROW_COUNT; i++) {
            this.cluesIn2DArray[i] = [];
        }

        round.clues.forEach(clue => this.cluesIn2DArray![clue.rowIndex][clue.categoryIndex] = clue);

        this.setCategoryNames(round.categories);
        this.setClueValues(round.type);
    }

    private setCategoryNames(categories: Category[]): void {
        if (categories.length !== GameBoard.TABLE_COLUMN_COUNT) {
            throw new Error(`The array of categories has length ${categories.length}, expected exactly ${GameBoard.TABLE_COLUMN_COUNT}`);
        }
        this.CATEGORY_CELLS.forEach(arrayOfTds => {
            for (let i = 0; i < GameBoard.TABLE_COLUMN_COUNT; i++) {
                arrayOfTds[i].innerText = categories[i].name;
            }
        });
    }

    private setClueValues(roundType: RoundType): void {
        this.CLUE_CELLS.forEach(cellsForTable => {
            for (let rowIndex = 0; rowIndex < GameBoard.TABLE_CLUE_ROW_COUNT; rowIndex++) {
                cellsForTable[rowIndex].forEach(td => td.innerText = `$${GameBoard.CLUE_VALUES[rowIndex] * GameBoard.MULTIPLIER[roundType]}`);
            }
        });
    }

    public resetCluesAvailability(): void {
        this.CLUE_CELLS.forEach(cellsForTable => cellsForTable.forEach(cellsInRow => cellsInRow.forEach(cell => cell.classList.add("avail"))));
    }

}