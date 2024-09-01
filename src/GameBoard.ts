import { Operator } from "./operator/Operator";
import { RoundType, GameRound } from "./typesForGame";

/**
 * The <table>s in the operator window and presentation windows should have the exact same
 * HTML structure. So a lot of stuff has a Set<>.
 */
export class GameBoard {

    public static readonly TABLE_COLUMN_COUNT = 6;

    /** The entire table has six rows. The first row is categories, followed by five rows of clues. */
    private static readonly TABLE_ROW_COUNT = 6;
    private static readonly TABLE_CLUE_ROW_COUNT = GameBoard.TABLE_ROW_COUNT - 1;

    private static readonly TOTAL_CLUES_COUNT = GameBoard.TABLE_COLUMN_COUNT * GameBoard.TABLE_CLUE_ROW_COUNT;

    /** Attribute name for whether the question behind a table cell has been revealed. */
    private static readonly CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED = "data-clue-revealed";
    private static readonly CELL_ATTRIBUTE_VALUE_NOT_REVEALED_YET = "no";
    private static readonly CELL_ATTRIBUTE_VALUE_ALREADY_REVEALED = "yes";

    private static readonly CLUE_VALUES = [200, 400, 600, 800, 1000];
    /** For Double Jeopardy, each dollar value is doubled. */
    private static readonly MULTIPLIER: { [roundType in RoundType]: number } = {
        "single": 1,
        "double": 2
    };

    /** 
     * The Map value is an array of table cells.
     * */
    private readonly CATEGORY_CELLS = new Set<HTMLTableCellElement[]>();

    /**
     * The Map key is the table in either the operator window and presentation window.
     * The 2D array is structured like an HTML table.
     * The Map value is a 2D array:
     *     The first array index is the <tr> (row) index.
     *     The second array index is the <td> (column) index.
     */
    private readonly CLUE_CELLS = new Map<HTMLTableElement, HTMLTableCellElement[][]>();

    private readonly OPERATOR;

    private cluesCountRevealedThisRound = NaN;

    private gameRound: GameRound | null = null;

    // TODO add a list of clues which have not been revealed yet, so we can get a random one if the team takes too long

    public constructor(operator: Operator, tableInOperatorWindow: HTMLTableElement, tableInPresentationWindow: HTMLTableElement) {
        this.OPERATOR = operator;

        [tableInOperatorWindow, tableInPresentationWindow].forEach(table => {

            const allRows = table.querySelectorAll("tr");
            if (allRows.length !== GameBoard.TABLE_ROW_COUNT) {
                throw new Error(`The table has ${allRows.length} <tr> element(s), expected exactly ${GameBoard.TABLE_ROW_COUNT}`);
            }

            /*
            This 2D array is structured like an HTML table.
            The first array index is the <tr> (row) index.
            The second array index is the <td> (column) index.
            */
            const clueCells: HTMLTableCellElement[][] = [];

            allRows.forEach((tr, trIndex) => {
                const tds = tr.querySelectorAll("td");
                if (tds.length !== GameBoard.TABLE_COLUMN_COUNT) {
                    throw new Error(`The table row at index ${trIndex} has ${tds.length} <td> element(s), expected exactly ${GameBoard.TABLE_COLUMN_COUNT}`);
                }

                if (trIndex === 0) {
                    // The first row is the categories.
                    this.CATEGORY_CELLS.add(Array.from(tds));
                } else {
                    /*
                    The first row in the table is categories, so the second row
                    in the table is the first row of clues.
                    */
                    const clueRowIndex = trIndex - 1;
                    clueCells[clueRowIndex] = Array.from(tds);
                }
            });
            this.CLUE_CELLS.set(table, clueCells);

        });

        // Add mouse listeners to the table in the operator window.
        this.CLUE_CELLS.get(tableInOperatorWindow)!.forEach((cellsInRow, clueRowIndex) =>
            cellsInRow.forEach((td, columnIndex) => {

                td.addEventListener("click", () => {
                    if (this.gameRound) {
                        const clue = this.gameRound.CLUES[clueRowIndex][columnIndex];
                        this.OPERATOR.onGameBoardClueClicked(clue);

                        // Hide the cell so it cannot be clicked on again.
                        this.CLUE_CELLS.forEach(twoDArray => twoDArray[clueRowIndex][columnIndex].setAttribute(
                            GameBoard.CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED,
                            GameBoard.CELL_ATTRIBUTE_VALUE_ALREADY_REVEALED));

                        this.cluesCountRevealedThisRound++;
                    } else {
                        console.warn("clicked on a cell but the game round has not been set");
                    }
                });

                td.addEventListener("mouseenter", () => {
                    this.CLUE_CELLS.get(tableInPresentationWindow)![clueRowIndex][columnIndex].classList.add("hover-in-operator-window");
                });

                td.addEventListener("mousedown", () => {
                    this.CLUE_CELLS.get(tableInPresentationWindow)![clueRowIndex][columnIndex].classList.add("active-in-operator-window");
                });

                td.addEventListener("mouseleave", () => {
                    this.CLUE_CELLS.get(tableInPresentationWindow)![clueRowIndex][columnIndex].classList.remove("hover-in-operator-window");
                    this.CLUE_CELLS.get(tableInPresentationWindow)![clueRowIndex][columnIndex].classList.remove("active-in-operator-window");
                });

                td.addEventListener("mouseup", () => {
                    this.CLUE_CELLS.get(tableInPresentationWindow)![clueRowIndex][columnIndex].classList.remove("active-in-operator-window");
                });

            }));


    }

    public setGameRound(gameRound: GameRound): void {
        this.gameRound = gameRound;

        // Set categories
        const categories = gameRound.CATEGORIES;
        if (categories.length !== GameBoard.TABLE_COLUMN_COUNT) {
            throw new Error(`The array of categories has length ${categories.length}, expected exactly ${GameBoard.TABLE_COLUMN_COUNT}`);
        }
        this.CATEGORY_CELLS.forEach(arrayOfTds => {
            for (let i = 0; i < GameBoard.TABLE_COLUMN_COUNT; i++) {
                arrayOfTds[i].innerText = categories[i].NAME;
            }
        });

        // Set values
        this.CLUE_CELLS.forEach(cellsForTable => {
            for (let rowIndex = 0; rowIndex < GameBoard.TABLE_CLUE_ROW_COUNT; rowIndex++) {
                cellsForTable[rowIndex].forEach(td => td.innerText =
                    `$${GameBoard.CLUE_VALUES[rowIndex] * GameBoard.MULTIPLIER[gameRound.TYPE]}`);
            }
        });

        // Set all clues to available
        this.CLUE_CELLS.forEach(cellsForTable =>
            cellsForTable.forEach(cellsInRow =>
                cellsInRow.forEach(cell =>
                    cell.setAttribute(
                        GameBoard.CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED,
                        GameBoard.CELL_ATTRIBUTE_VALUE_NOT_REVEALED_YET
                    )
                )
            )
        );

        this.cluesCountRevealedThisRound = 0;
    }

    public isAllCluesRevealedThisRound(): boolean {
        return this.cluesCountRevealedThisRound === GameBoard.TOTAL_CLUES_COUNT;
    }

}