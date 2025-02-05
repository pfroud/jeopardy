import { Operator } from "./operator/Operator";
import { RoundType, GameRound, Clue } from "./typesForGame";

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
     * There is one array of <tds> for the game board in the operator window, 
     * and one array of <td>s for the game board in the presentation window.
     */
    private readonly CATEGORY_CELLS = new Set<HTMLTableCellElement[]>();

    /**
     * The Map key is the table in either the operator window and presentation window.
     * The 2D array is structured like an HTML table.
     * The Map value is a 2D array:
     *     The first array index is the <tr> (row) index.
     *     The second array index is the <td> (column) index.
     */
    private readonly CLUE_CELLS = new Map<HTMLTableElement, HTMLTableCellElement[][]>();

    /** Only used to remove style from presentation window when the game pauses. */
    private cellHovering: HTMLTableCellElement | null = null;

    /** Only used to remove style from presentation window when the game pauses. */
    private cellActive: HTMLTableCellElement | null = null;

    /** Only used to check if the game paused while the mouse was down. */
    private isMouseDown = false;

    /** Only used to check if the game paused while the mouse was down. */
    private cancelClickEventBecauseGamePausedWhenMouseWasDown = false;

    private readonly OPERATOR;

    private gameRound: GameRound | null = null;

    private cluesNotYetRevealedThisRound: Set<Clue> | null = null;

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

                    if (this.OPERATOR.isPaused()) {
                        return;
                    }

                    if (this.cancelClickEventBecauseGamePausedWhenMouseWasDown) {
                        this.cancelClickEventBecauseGamePausedWhenMouseWasDown = false;
                        return;
                    }

                    if (this.gameRound) {
                        const clue = this.gameRound.CLUES[clueRowIndex][columnIndex];
                        this.OPERATOR.onGameBoardClueClicked(clue);

                        if (this.cluesNotYetRevealedThisRound) {
                            this.cluesNotYetRevealedThisRound.delete(clue);
                        } else {
                            throw new Error("clicked on a clue but the Set of clues not yet revealed hasn't been set up");
                        }

                        // Hide the cell so it cannot be clicked on again.
                        this.CLUE_CELLS.forEach(twoDArray => twoDArray[clueRowIndex][columnIndex].setAttribute(
                            GameBoard.CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED,
                            GameBoard.CELL_ATTRIBUTE_VALUE_ALREADY_REVEALED));

                    } else {
                        throw new Error("clicked on a cell but the game round has not been set");
                    }
                });


                const clueCellsForPresentation = this.CLUE_CELLS.get(tableInPresentationWindow);

                td.addEventListener("mouseenter", () => {
                    if (!this.OPERATOR.isPaused()) {
                        const cell = clueCellsForPresentation![clueRowIndex][columnIndex];
                        cell.classList.add("hover-in-operator-window");
                        this.cellHovering = cell;
                    }
                });

                td.addEventListener("mousedown", () => {
                    if (!this.OPERATOR.isPaused()) {
                        const cell = clueCellsForPresentation![clueRowIndex][columnIndex];
                        cell.classList.add("active-in-operator-window");
                        this.cellActive = cell;
                        this.isMouseDown = true;
                    }
                });

                td.addEventListener("mouseleave", () => {
                    if (!this.OPERATOR.isPaused()) {
                        const cell = clueCellsForPresentation![clueRowIndex][columnIndex];
                        cell.classList.remove("hover-in-operator-window");
                        cell.classList.remove("active-in-operator-window");
                        this.cellActive = null;
                        this.cellHovering = null;
                    }
                });

                td.addEventListener("mouseup", () => {
                    if (!this.OPERATOR.isPaused()) {
                        const cell = clueCellsForPresentation![clueRowIndex][columnIndex];
                        cell.classList.remove("active-in-operator-window");
                        this.cellActive = null;
                        this.isMouseDown = false;
                    }
                });

            }));


    }

    public onGamePause(): void {
        this.cellActive?.classList.remove("active-in-operator-window");
        this.cellHovering?.classList.remove("hover-in-operator-window");
        if (this.isMouseDown) {
            this.cancelClickEventBecauseGamePausedWhenMouseWasDown = true;
        }
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
                const category = categories[i];
                const td = arrayOfTds[i];
                td.innerText = category.NAME;

                if (category.specialCategory !== undefined) {

                    const specialCategoryIconWrapper = document.createElement("div");
                    specialCategoryIconWrapper.classList.add("special-category-icon-wrapper");
                    specialCategoryIconWrapper.title = `This is a special category: ${category.specialCategory.DISPLAY_NAME}`;

                    const specialCategoryIcon = document.createElement("div");
                    specialCategoryIcon.classList.add("special-category-icon");
                    specialCategoryIcon.innerText = "i";

                    specialCategoryIconWrapper.append(specialCategoryIcon);
                    td.append(" ");
                    td.append(specialCategoryIconWrapper);
                }

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

        this.cluesNotYetRevealedThisRound = new Set(gameRound.CLUES.flat());
    }

    public getRandomUnrevealedClue(): Clue {
        if (this.cluesNotYetRevealedThisRound) {

            /*
            There isn't a way to get a random element from a Set, and apparently
            the only way to remove an element from an array is to use splice()
            which is crazy. So I'm using keeping a Set<Clue> for easy element
            removal and converting it to an array to get a random element.
            */
            const setToArray = Array.from(this.cluesNotYetRevealedThisRound);

            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_integer_between_two_values
            const randomIndex = Math.floor(Math.random() * setToArray.length); //https://stackoverflow.com/a/42739372/7376577

            const rv = setToArray[randomIndex];

            this.cluesNotYetRevealedThisRound.delete(rv);

            this.CLUE_CELLS.forEach(twoDArray => twoDArray[rv.ROW_INDEX][rv.COLUMN_INDEX].setAttribute(
                GameBoard.CELL_ATTRIBUTE_NAME_IS_CLUE_REVEALED,
                GameBoard.CELL_ATTRIBUTE_VALUE_ALREADY_REVEALED));

            return rv;
        } else {
            throw new Error("trying to get a random unrevealed clue when the game round has not been set");
        }
    }

    public isAllCluesRevealedThisRound(): boolean {
        if (this.cluesNotYetRevealedThisRound) {
            return this.cluesNotYetRevealedThisRound.size === 0;
        } else {
            throw new Error("checking if all clues revealed in this round but the Set<Clue> is null");
        }
    }

}