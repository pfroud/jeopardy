import { Category, Round, RoundType, ScrapedClue } from "../games";
import { Operator } from "./Operator";

/**
 * The <table>s in the operator window and presentation windows should have the exact same
 * HTML structure. So a lot of stuff has a Set<>.
 */
export class GameBoard {

    private static readonly TABLE_COLUMN_COUNT = 6;

    /** The entire table has six rows. The first row is categories, followed by five rows of clues. */
    private static readonly TABLE_ROW_COUNT = 6;
    private static readonly TABLE_CLUE_ROW_COUNT = GameBoard.TABLE_ROW_COUNT - 1;

    /** Attribute name for whether the question behind a table cell has been revealed. */
    private static readonly CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED = "data-clue-revealed";
    private static readonly CELL_ATTRIBUTE_VALUE_NOT_REVEALED_YET = "no";
    private static readonly CELL_ATTRIBUTE_VALUE_ALREADY_REVEALED = "yes";

    /** For Double Jeopardy, each number is doubled. */
    private static readonly CLUE_VALUES = [200, 400, 600, 800, 1000];
    private static readonly MULTIPLIER: { [roundType in RoundType]: number } = {
        "single": 1,
        "double": 2
    };

    /** One for the operator window and one for the presentation window. */
    private readonly TABLES = new Set<HTMLTableElement>();

    /** 
     * The Map key is the table in either the operator window or the presentation window.
     * The Map value is an array of table columns.
     * */
    private readonly CATEGORY_CELLS = new Map<HTMLTableElement, HTMLTableCellElement[]>();

    /**
     * The Map key is the table in either the operator window and presentation window.
     * The Map value is a 2D array:
     *     The first array index is the <tr> index.
     *     The second array index is the <td> index.
     */
    private readonly CLUE_CELLS = new Map<HTMLTableElement, HTMLTableCellElement[][]>();

    private readonly OPERATOR;

    private round: Round | null = null;


    /**
     * @param tables the <table> in the operator window and in the presentation window.
     */
    public constructor(operator: Operator, ...tables: HTMLTableElement[]) {
        this.OPERATOR = operator;
        tables.forEach(table => this.initializeTable(table));
    }

    public show(): void {
        this.TABLES.forEach(table => table.style.display = "table");
    }

    public hide(): void {
        this.TABLES.forEach(table => table.style.display = "none");
    }

    private initializeTable(table: HTMLTableElement): void {
        this.TABLES.add(table);

        const allRows = table.querySelectorAll("tr");
        if (allRows.length !== GameBoard.TABLE_ROW_COUNT) {
            throw new Error(`The table has ${allRows.length} <tr> element(s), expected exactly ${GameBoard.TABLE_ROW_COUNT}`);
        }

        const clueCells: HTMLTableCellElement[][] = [];

        allRows.forEach((tr, trIndex) => {
            const tds = tr.querySelectorAll("td");
            if (tds.length !== GameBoard.TABLE_COLUMN_COUNT) {
                throw new Error(`The table row at index ${trIndex} has ${tds.length} <td> element(s), expected exactly ${GameBoard.TABLE_COLUMN_COUNT}`);
            }
            if (trIndex === 0) {
                // The first row is the categories.
                this.CATEGORY_CELLS.set(table, Array.from(tds));
                tds.forEach((td, idx) => td.innerText = `Category ${idx + 1}`);
                // The actual category names are set separately, by calling setCategoryNames(). but why?

            } else {
                /*
                The first row in the table is categories, so the second row
                in the table is the first row of clues.
                */
                const clueRowIndex = trIndex - 1;

                clueCells[clueRowIndex] = Array.from(tds);
                tds.forEach((td, tdIndex) => {

                    td.innerText = `Row ${trIndex}`;
                    td.setAttribute(
                        GameBoard.CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED,
                        GameBoard.CELL_ATTRIBUTE_VALUE_NOT_REVEALED_YET
                    );

                    td.addEventListener("click", () => {
                        if (this.round) {
                            const columnIndex = tdIndex;
                            const clue = this.round.clues[clueRowIndex][columnIndex];
                            this.OPERATOR.gameBoardClueClicked(
                                clue,
                                this.round.categories[tdIndex].name,
                                GameBoard.CLUE_VALUES[clueRowIndex] * GameBoard.MULTIPLIER[this.round.type]
                            );

                            td.setAttribute(
                                GameBoard.CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED,
                                GameBoard.CELL_ATTRIBUTE_VALUE_ALREADY_REVEALED
                            );

                        } else {
                            console.warn("clicked on a cell but the game round has not been set");
                        }
                    });


                    const tds = this.CATEGORY_CELLS.get(table);
                    td.addEventListener("mouseenter", () => {
                        tds![tdIndex].classList.add("mouse-is-over");
                    });
                    td.addEventListener("mouseleave", () => {
                        tds![tdIndex].classList.remove("mouse-is-over");
                    });
                });

            }
        });
        this.CLUE_CELLS.set(table, clueCells);
    }

    public setRound(round: Round): void {
        this.round = round;
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
                cellsForTable[rowIndex].forEach(td => td.innerText =
                    `$${GameBoard.CLUE_VALUES[rowIndex] * GameBoard.MULTIPLIER[roundType]}`);
            }
        });
    }

    public resetCluesAvailability(): void {
        this.CLUE_CELLS.forEach(cellsForTable =>
            cellsForTable.forEach(cellsInRow =>
                cellsInRow.forEach(cell =>
                    cell.setAttribute(GameBoard.CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED,
                        GameBoard.CELL_ATTRIBUTE_VALUE_NOT_REVEALED_YET)
                )
            )
        );
    }

}