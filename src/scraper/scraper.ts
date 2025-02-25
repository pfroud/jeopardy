/*
This file is not an Ecmascript module because that would make
it not work when you paste it into a web browser debugger console.

To compile the scraper only to a Javascript file to run in the browser:
1. If needed, change the file extension of this file from .ts.txt to .ts.
2. On the terminal, run "tsc src/scraper/scraper.ts". It will generate scraper.js.

But when this file has .ts file extension, all the types from this file
will be visible to VS Code in the rest of the project. But since this file is NOT an 
Ecmascript module it will not actually work when used in a web browser.

If you typececk the entire project by running "tsc -noemit" when this file has .ts file extension,
you'll get this error:
    src/scraper/scraper.ts - error TS1208: 'scraper.ts' cannot be compiled under '--isolatedModules'
    because it is considered a global script file. Add an import, export, or an empty 'export {}'
    statement to make it a module.

Info about isolatedModules: https://www.typescriptlang.org/tsconfig/#isolatedModules

So when I am not editing this file I change the file extension to .ts.txt.
*/

type Game = {
    /** From game_id in URL */
    readonly J_ARCHIVE_GAME_ID: number;
    /** From the header in the webpage */
    readonly SHOW_NUMBER: number;
    readonly AIRDATE: string;
    readonly ROUNDS: GameRound[];
}

type RoundType = "single" | "double";

type Clue = HiddenClue | RevealedClue;
type GameRound = {
    readonly TYPE: RoundType;
    readonly CATEGORIES: Category[];
    /**
     * This 2D array follows the structure of an HTML table.
     * The first array index is the row index.
     * The second array index is the column index.
     * */
    readonly CLUES: Clue[][];
}

const CLUE_VALUES = [200, 400, 600, 800, 1000];
/** For Double Jeopardy, each dollar value is doubled. */
const CLUE_VALUE_MULTIPLIER: { [roundType in RoundType]: number } = {
    "single": 1,
    "double": 2
};

type Category = {
    readonly NAME: string;
    /** A few categories have a comment from the host explaining the meaning of the category name. */
    COMMENT?: string;
}

/** This clue was never revealed on the Jeopardy TV show, so J Archive does not have it. */
type HiddenClue = {
    readonly REVEALED_ON_TV_SHOW: false;
}

/**
 * This clue was revealed on the Jeopardy TV show, so J Archive also has it.
 * 
 * The value and category name are redundant because we could get them from the row/column indexes,
 * but it is much easier to include them here.
 * */
type RevealedClue = {
    readonly REVEALED_ON_TV_SHOW: true;
    /** Text which is shown on screen and the game host reads out loud. */
    readonly QUESTION: string;
    /** If a player says this, they get the money. */
    readonly ANSWER: string;
    readonly VALUE: number;
    readonly CATEGORY_NAME: string;
    readonly ROW_INDEX: number;
    readonly COLUMN_INDEX: number;
}

function main(): void {

    // This header contains the show number and the airdate. Example: "Show #8708 - Wednesday, September 28, 2022"
    const h1Text = document.querySelector("h1")!.innerText;

    const result: Game = {
        // example URL: https://j-archive.com/showgame.php?game_id=7451
        J_ARCHIVE_GAME_ID: Number(new URLSearchParams(window.location.search).get("game_id")),
        SHOW_NUMBER: Number(/Show #(\d+)/.exec(h1Text)![1]),
        AIRDATE: h1Text.split(" - ")[1],
        ROUNDS: [
            parseTableForRound("single", document.querySelector<HTMLTableElement>("div#jeopardy_round table.round")!),
            parseTableForRound("double", document.querySelector<HTMLTableElement>("div#double_jeopardy_round table.round")!),
        ]
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
    window.navigator.clipboard.writeText(JSON.stringify(result, null, 2))
        // The promise resolves once the clipboard's contents have been updated
        .then(() =>
            // https://developer.mozilla.org/en-US/docs/Web/API/console#styling_console_output
            console.log("%cSuccess, copied the game from J-Archive to the clipboard.",
                `
                font-family: sans-serif;
                font-size: large;
                font-weight: bold;
                background: green;
                display: inline-block;
                border: 1px solid lime;
                border-radius: 5px;
                padding: 5px 10px;
                margin: 10px auto;
                `)
        );


}
main();

function parseTableForRound(roundType: RoundType, table: HTMLTableElement): GameRound {

    /*
    About the :scope pseudo-class:
    https://developer.mozilla.org/en-US/docs/Web/CSS/:scope

    About the > combinator (it does direct children):
    https://developer.mozilla.org/en-US/docs/Web/CSS/Child_combinator

    From https://stackoverflow.com/a/17206138/7376577
    */

    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>(":scope>tbody>tr"));
    if (rows.length !== 6) {
        throw new Error(`got ${rows.length} row(s), expected exactly 6`);
    }

    const categoryRow = rows[0];
    const categories =
        Array.from(categoryRow.querySelectorAll<HTMLTableCellElement>("td.category")).
            map(td => {
                const rv: Category = {
                    NAME: td.querySelector<HTMLTableCellElement>("td.category_name")!.innerText
                };
                const commentsString = td.querySelector<HTMLTableCellElement>("td.category_comments")!.innerText.trim();
                if (commentsString.length > 0) {
                    rv.COMMENT = commentsString;
                }
                return rv;
            });


    const clueRows = rows.slice(1); //skip the first item in the list, it is the row of categories.

    const clues = clueRows.map((clueRow: HTMLTableRowElement, rowIndex): Clue[] =>
        Array.from(clueRow.querySelectorAll<HTMLTableCellElement>("td.clue"))
            .map((tdClue: HTMLTableCellElement, categoryIndex): Clue => {

                if (tdClue.childElementCount === 0) {
                    // Clue was NOT revealed on the TV show
                    return { REVEALED_ON_TV_SHOW: false };

                } else {
                    // Clue was revealed on the TV show
                    const directChildrenRowsOfTdClue = tdClue.querySelectorAll(":scope>table>tbody>tr");
                    if (directChildrenRowsOfTdClue.length !== 2) {
                        throw new Error(`the td.clue has ${directChildrenRowsOfTdClue.length} trs, expected exactly 2`);
                    }
                    const childRow = directChildrenRowsOfTdClue[1];

                    // Text which is shown on screen and the game host reads out loud.
                    const question = childRow.querySelector<HTMLTableCellElement>('td.clue_text:not([display="none"])')!.innerText;

                    // If a player says this, they get the money.
                    const answer = childRow.querySelector<HTMLTableCellElement>("td.clue_text em.correct_response")!.innerText;

                    return {
                        REVEALED_ON_TV_SHOW: true,
                        QUESTION: question,
                        ANSWER: answer,
                        ROW_INDEX: rowIndex,
                        COLUMN_INDEX: categoryIndex,
                        VALUE: CLUE_VALUES[rowIndex] * CLUE_VALUE_MULTIPLIER[roundType],
                        CATEGORY_NAME: categories[categoryIndex].NAME
                    };
                }
            })
    );

    return {
        TYPE: roundType,
        CATEGORIES: categories,
        CLUES: clues
    };

}

