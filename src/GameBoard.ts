import { Operator } from "./operator/Operator";
import { GameRound, RevealedClue, RoundType } from "./typesForGame";

/*
Example of what the game board looks like:
|------------+------------+------------+------------+------------+------------+
| Category 1 | Category 2 | Category 3 | Category 4 | Category 5 | Category 6 |
|------------+------------+------------+------------+------------+------------|
|    $200    |    $200    |    $200    |    $200    |    $200    |    $200    |
|------------+------------+------------+------------+------------+------------|
|    $400    |    $400    |    $400    |    $400    |    $400    |    $400    |
|------------+------------+------------+------------+------------+------------|
|    $600    |    $600    |    $600    |    $600    |    $600    |    $600    |
|------------+------------+------------+------------+------------+------------|
|    $800    |    $800    |    $800    |    $800    |    $800    |    $800    |
|------------+------------+------------+------------+------------+------------|
|   $1000    |   $1000    |   $1000    |   $1000    |   $1000    |   $1000    |
|------------+------------+------------+------------+------------+------------+
*/

/**
 * The <table>s in the operator window and presentation windows should have the exact same
 * HTML structure. So a lot of stuff has a Set<>.
 */
export class GameBoard {

    public static readonly TABLE_COLUMN_COUNT = 6;

    /** The entire HTML <table> has six rows. */
    public static readonly TABLE_TOTAL_ROW_COUNT = 6;

    /**
     * How many rows in the HTML <table> are for clues. Clues on the game board are represented
     * by a dollar value.
     *  
     * The first row shows category names, and all the other rows are for clues.
     */
    public static readonly TABLE_CLUE_ROW_COUNT = GameBoard.TABLE_TOTAL_ROW_COUNT - 1;

    /** For Double Jeopardy, each dollar value is doubled. */
    public static readonly GAME_ROUND_VALUE_MULTIPLIER: { [roundType in RoundType]: number } = {
        "single": 1,
        "double": 2
    };

    /**
     * CSS class added to table cells in the presentation window to show mouse interactions in the operator window.
     * Replicates the CSS :hover pseudo-class.
     * 
     * The class is added to a cell on the mouseenter event.
     * The class is removed from a cell on the mouseleave event (and some other ways).
     */
    private static readonly CELL_CLASS_MOUSE_OVER_IN_OPERATOR_WINDOW = "mouse-over-cell-in-operator-window";


    /**
     * CSS class added to table cells in the presentation window to show mouse interactions in the operator window.
     * Replicates the CSS :active pseudo-class.
     * 
     * The class is added to a cell on the mousedown event.
     * The class is removed from a cell on the mouseup event (and some other ways).
     */
    private static readonly CELL_CLASS_MOUSE_DOWN_IN_OPERATOR_WINDOW = "mouse-down-on-cell-in-operator-window";

    private readonly OPERATOR;

    /** 
     * Data structure containing all the cells which show a category name, in both the operator window and
     * the presentation window.
     * 
     * There is one array of <td>s for the game board in the operator window, and one array of <td>s for
     * the game board in the presentation window.
     */
    private readonly ALL_CATEGORY_CELLS = new Set<HTMLTableCellElement[]>();

    /**
     * Data structure containing all the cells which represent a clue (displayed a dollar value), in both
     * the operator window and the presentation window.
     * 
     * The Map key is the <table> element in either the operator window or the presentation window.
     * 
     * The Map value is a 2D array, structured like an HTML table:
     * - The first array index is the <tr> (row) index.
     * - The second array index is the <td> (column) index.
     */
    private readonly ALL_CLUE_CELLS = new Map<HTMLTableElement, HTMLTableCellElement[][]>();

    /**
     * Keep track of which clue was selected previously to show a little GUI accent.
     * 
     * This is a Set because we need to keep track of one cell in the operator window
     * and one cell in the presentation window.
     */
    private readonly CELL_SELECTED_LAST_TIME = new Set<HTMLTableCellElement>();

    /** Only used to remove style from presentation window when the game pauses. */
    private cellInPresentationWindowShowingMouseOver: HTMLTableCellElement | null = null;

    /** Only used to remove style from presentation window when the game pauses. */
    private cellInPresentationWindowShowingMouseDown: HTMLTableCellElement | null = null;

    /** Only used to check if the game paused while the mouse was down. */
    private isMouseDown = false;

    /** Only used to check if the game paused while the mouse was down. */
    private cancelClickEventBecauseGamePausedWhenMouseWasDown = false;

    private gameRound: GameRound | null = null;

    private cluesStillAvailableThisRound: Set<RevealedClue> | null = null;

    public constructor(operator: Operator, tableInOperatorWindow: HTMLTableElement, tableInPresentationWindow: HTMLTableElement) {
        this.OPERATOR = operator;

        /*
        Validate the structure of the HTML <tables>s and populate data structures.

        Here we are running the same forEach callback on both tables. Later we will do stuff
        to only the table in the operator window.
        */
        [tableInOperatorWindow, tableInPresentationWindow].forEach(table => {

            const allRowsInThisTable = table.querySelectorAll("tr");
            if (allRowsInThisTable.length !== GameBoard.TABLE_TOTAL_ROW_COUNT) {
                throw new Error(`The table has ${allRowsInThisTable.length} <tr> element(s), expected exactly ${GameBoard.TABLE_TOTAL_ROW_COUNT}`);
            }

            /*
            This 2D array is structured like an HTML table:
            The first array index is the <tr> (row) index.
            The second array index is the <td> (column) index.
            */
            const clueCellsForThisTable: HTMLTableCellElement[][] = [];

            allRowsInThisTable.forEach((tr, trIndex) => {
                const tds = tr.querySelectorAll("td");
                if (tds.length !== GameBoard.TABLE_COLUMN_COUNT) {
                    throw new Error(`The table row at index ${trIndex} has ${tds.length} <td> element(s), expected exactly ${GameBoard.TABLE_COLUMN_COUNT}`);
                }

                if (trIndex === 0) {
                    // The first row shows the category names.
                    this.ALL_CATEGORY_CELLS.add(Array.from(tds));
                } else {
                    /*
                    The SECOND row in the table is the FIRST row of clues
                    (because the first row in the table is categories).

                    So when trIndex is one, clueRowIndex is zero.
                    */
                    const clueRowIndex = trIndex - 1;
                    clueCellsForThisTable[clueRowIndex] = Array.from(tds);
                }
            });
            this.ALL_CLUE_CELLS.set(table, clueCellsForThisTable);

        });

        /*
        Add mouse listeners to the table in the operator window.

        I am putting mouse listeners on every table cell, including cells for clues not
        revealed in the TV show, because the <table> element is re-used for every game
        round. I don't want to later check which cells already have mouse listeners on them.
        */
        const clueCellsInOperatorWindow = this.ALL_CLUE_CELLS.get(tableInOperatorWindow)!;
        clueCellsInOperatorWindow.forEach((cellsInRow, clueRowIndex) =>
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
                        const clueClickedOn = this.gameRound.CLUES[clueRowIndex][columnIndex];
                        if (clueClickedOn.REVEALED_ON_TV_SHOW && this.cluesStillAvailableThisRound?.has(clueClickedOn)) {
                            this.OPERATOR.onGameBoardClueClicked(clueClickedOn);
                            this.cluesStillAvailableThisRound.delete(clueClickedOn);

                            this.CELL_SELECTED_LAST_TIME.forEach(cell => cell.classList.remove("clueWasChosenLastTime"));
                            this.CELL_SELECTED_LAST_TIME.clear();

                            /*
                            Don't need to use a Map key here, just run the forEach callback on all the Map values.
                            The Map values are arrays of table cells in the operator window and presentation window.
                            */
                            this.ALL_CLUE_CELLS.forEach(twoDArray => {
                                const cellClickedOn = twoDArray[clueRowIndex][columnIndex];
                                cellClickedOn.setAttribute("data-clue-state", "done");
                                cellClickedOn.classList.add("clueWasChosenLastTime");
                                this.CELL_SELECTED_LAST_TIME.add(cellClickedOn);
                            });
                        }
                    } else {
                        throw new Error("clicked on a cell but the game round has not been set");
                    }
                });


                const twoDArrayOfClueCellsInPresentationWindow = this.ALL_CLUE_CELLS.get(tableInPresentationWindow)!;

                td.addEventListener("mouseenter", () => {
                    if (!this.OPERATOR.isPaused()) {
                        const cellInPresentationWindow = twoDArrayOfClueCellsInPresentationWindow[clueRowIndex][columnIndex];
                        cellInPresentationWindow.classList.add(GameBoard.CELL_CLASS_MOUSE_OVER_IN_OPERATOR_WINDOW);
                        this.cellInPresentationWindowShowingMouseOver = cellInPresentationWindow;
                    }
                });

                td.addEventListener("mousedown", () => {
                    if (!this.OPERATOR.isPaused()) {
                        const cellInPresentationWindow = twoDArrayOfClueCellsInPresentationWindow[clueRowIndex][columnIndex];
                        cellInPresentationWindow.classList.add(GameBoard.CELL_CLASS_MOUSE_DOWN_IN_OPERATOR_WINDOW);
                        this.cellInPresentationWindowShowingMouseDown = cellInPresentationWindow;
                        this.isMouseDown = true;
                    }
                });

                td.addEventListener("mouseleave", () => {
                    if (!this.OPERATOR.isPaused()) {
                        const cellInPresentationWindow = twoDArrayOfClueCellsInPresentationWindow[clueRowIndex][columnIndex];
                        cellInPresentationWindow.classList.remove(GameBoard.CELL_CLASS_MOUSE_OVER_IN_OPERATOR_WINDOW);
                        cellInPresentationWindow.classList.remove(GameBoard.CELL_CLASS_MOUSE_DOWN_IN_OPERATOR_WINDOW);
                        this.cellInPresentationWindowShowingMouseDown = null;
                        this.cellInPresentationWindowShowingMouseOver = null;
                    }
                });

                td.addEventListener("mouseup", () => {
                    if (!this.OPERATOR.isPaused()) {
                        const cellInPresentationWindow = twoDArrayOfClueCellsInPresentationWindow[clueRowIndex][columnIndex];
                        cellInPresentationWindow.classList.remove(GameBoard.CELL_CLASS_MOUSE_DOWN_IN_OPERATOR_WINDOW);
                        this.cellInPresentationWindowShowingMouseDown = null;
                        this.isMouseDown = false;
                    }
                });

            }));


    }

    public onGamePause(): void {
        this.cellInPresentationWindowShowingMouseDown?.classList.remove(GameBoard.CELL_CLASS_MOUSE_DOWN_IN_OPERATOR_WINDOW);
        this.cellInPresentationWindowShowingMouseOver?.classList.remove(GameBoard.CELL_CLASS_MOUSE_OVER_IN_OPERATOR_WINDOW);
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
        this.ALL_CATEGORY_CELLS.forEach(arrayOfTds => {
            for (let i = 0; i < GameBoard.TABLE_COLUMN_COUNT; i++) {
                const category = categories[i];
                const td = arrayOfTds[i];
                td.innerText = category.NAME;

                if (category.specialCategory) {

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

        // Set dollar values in both the operator window and presentation window
        this.ALL_CLUE_CELLS.forEach(cellsForTable => {
            for (let clueRowIndex = 0; clueRowIndex < GameBoard.TABLE_CLUE_ROW_COUNT; clueRowIndex++) {
                for (let columnIndex = 0; columnIndex < GameBoard.TABLE_COLUMN_COUNT; columnIndex++) {

                    const clue = gameRound.CLUES[clueRowIndex][columnIndex];
                    const tableCell = cellsForTable[clueRowIndex][columnIndex];

                    if (clue.REVEALED_ON_TV_SHOW) {
                        tableCell.setAttribute("data-clue-state", "available");
                        tableCell.innerHTML = `$${(clueRowIndex + 1) * 200 * GameBoard.GAME_ROUND_VALUE_MULTIPLIER[gameRound.TYPE]}`;
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

            // Mark the clue done in both the operator window and presentation window
            this.ALL_CLUE_CELLS.forEach(twoDArray => twoDArray[rv.ROW_INDEX][rv.COLUMN_INDEX]
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