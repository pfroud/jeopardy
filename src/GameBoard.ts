import { Operator } from "./operator/Operator";
import { GameRound, RevealedClue, RoundType } from "./typesForGame";

/**
 * The <table>s in the operator window and presentation windows should have the exact same
 * HTML structure. So a lot of stuff has a Set<>.
 */
export class GameBoard {

    public static readonly TABLE_COLUMN_COUNT = 6;

    /** The entire table has six rows. The first row is categories, followed by five rows of clues. */
    private static readonly TABLE_ROW_COUNT = 6;
    private static readonly TABLE_CLUE_ROW_COUNT = GameBoard.TABLE_ROW_COUNT - 1;

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

    private cluesStillAvailableThisRound: Set<RevealedClue> | null = null;

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

        /*
        Add mouse listeners to the table in the operator window.

        I am putting mouse listeners on every table cell, including cells for clues not
        revealed in the TV show, because the <table> element is re-used for every game
        round. I don't want to late check which cells already have mouse listeners on them.
        */
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
                        if (clue.REVEALED_ON_TV_SHOW && this.cluesStillAvailableThisRound?.has(clue)) {
                            this.OPERATOR.onGameBoardClueClicked(clue);
                            this.cluesStillAvailableThisRound.delete(clue);
                            this.CLUE_CELLS.forEach(twoDArray => twoDArray[clueRowIndex][columnIndex].setAttribute("data-clue-state", "done"));
                        }
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

        // Set dollar values
        this.CLUE_CELLS.forEach(cellsForTable => {
            for (let clueRowIndex = 0; clueRowIndex < GameBoard.TABLE_CLUE_ROW_COUNT; clueRowIndex++) {
                for (let columnIndex = 0; columnIndex < GameBoard.TABLE_COLUMN_COUNT; columnIndex++) {

                    const clue = gameRound.CLUES[clueRowIndex][columnIndex];
                    const tableCell = cellsForTable[clueRowIndex][columnIndex];

                    if (clue.REVEALED_ON_TV_SHOW) {
                        tableCell.setAttribute("data-clue-state", "available");
                        tableCell.innerHTML = `$${GameBoard.CLUE_VALUES[clueRowIndex] * GameBoard.MULTIPLIER[gameRound.TYPE]}`;
                    } else {
                        tableCell.setAttribute("data-clue-state", "not-revealed-on-tv-show");
                    }
                }
            }
        });

        this.cluesStillAvailableThisRound = new Set(gameRound.CLUES.flat().filter(clue => clue.REVEALED_ON_TV_SHOW));
    }

    public getRandomAvailableClue(): RevealedClue {
        if (this.cluesStillAvailableThisRound) {

            /*
            There isn't a way to get a random element from a Set, and apparently
            the only way to remove an element from an array is to use splice()
            which is crazy. So I'm using keeping a Set<Clue> for easy element
            removal and converting it to an array to get a random element.
            */
            const setToArray = Array.from(this.cluesStillAvailableThisRound);

            // https://stackoverflow.com/a/42739372/7376577
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_integer_between_two_values
            const randomIndex = Math.floor(Math.random() * setToArray.length);

            const rv = setToArray[randomIndex];

            this.cluesStillAvailableThisRound.delete(rv);

            this.CLUE_CELLS.forEach(twoDArray => twoDArray[rv.ROW_INDEX][rv.COLUMN_INDEX]
                .setAttribute("data-clue-state", "done"));

            return rv;
        } else {
            throw new Error("trying to get a random unrevealed clue when the game round has not been set");
        }
    }

    public isAllCluesRevealedThisRound(): boolean {
        if (this.cluesStillAvailableThisRound) {
            return this.cluesStillAvailableThisRound.size === 0;
        } else {
            throw new Error("checking if all clues revealed in this round but the Set<Clue> is null");
        }
    }
}