/*
This file is not an Ecmascript module because that would make
it not work when run from a web browser bookmarklet.

To compile the only the scraper to a Javascript file to run in the browser:
1. If needed, change the file extension of this file from .ts.txt to .ts.
2. On the terminal, run "tsc src/scraper/scraper.ts". It will generate scraper.js.

But when this file has .ts file extension, all the types from this file
will be visible to VS Code in the rest of the project. But since this file is NOT an 
Ecmascript module it will not actually work when used in a web browser.

If you typecheck the entire project by running "tsc -noemit" when this file has .ts file extension,
you'll get this error:
    src/scraper/scraper.ts - error TS1208: 'scraper.ts' cannot be compiled under '--isolatedModules'
    because it is considered a global script file. Add an import, export, or an empty 'export {}'
    statement to make it a module.

Info about isolatedModules: https://www.typescriptlang.org/tsconfig/#isolatedModules

So when I am not editing this file I change the file extension to .ts.txt.

For this to work in a bookmarklet, all comments must be block comments not line
comments because the entire file becomes a single line in a bookmarklet!
*/

type FinalJeopardy = {
    readonly CATEGORY: string;
    readonly QUESTION: string;
    readonly ANSWER: string
};

type Game = {
    /** From game_id in URL */
    readonly J_ARCHIVE_GAME_ID: number;
    /** From the header in the webpage */
    readonly SHOW_NUMBER: number;
    readonly AIRDATE: string;
    readonly ROUNDS: GameRound[];
    readonly FINAL_JEOPARDY?: FinalJeopardy;
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

type Category = {
    readonly NAME: string;
    /** A few categories have a comment from the host explaining the meaning of the category name. */
    COMMENT_FROM_TV_SHOW_HOST?: string;
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
    if (!window.location.href.includes("j-archive.com/showgame.php")) {
        window.alert(
            "Jeopardy scraper: not running because this does not appear to be a J Archive game page.\n" +
            "\n" +
            "The scraper should be run on a page with a URL like \"j-archive.com/showgame.php\".\n" +
            "\n" +
            "To get to a page like that:\n" +
            "1. Go to j-archive.com.\n" +
            "2. Click on one of the season numbers in square brackets.\n" +
            "3. Click on a game.\n" +
            "4. Run scraper."
        );
        return;
    }
    addEventListener("error", (error) =>
        window.alert(`Error from Jeopardy scraper: ${error.message}`)
    );


    /* This header contains the show number and the airdate. Example: "Show #8708 - Wednesday, September 28, 2022" */
    const h1Text = document.querySelector("h1")!.innerText;

    const finalJeopardyContainer = document.querySelector("table.final_round")!;

    const result: Game = {
        /* example URL: https://j-archive.com/showgame.php?game_id=7451 */
        J_ARCHIVE_GAME_ID: Number(new URLSearchParams(window.location.search).get("game_id")),

        /*
        All seasons listed on the J-Archive homepage have "Show #" in the <h1>.
        But some specials seasons from j-archive.com/listseasons.php instead have:
            - "The Greatest of All Time game #"
            - "National College Championship game #"
            - "Primetime Celebrity Jeopardy! game #"
            - Jeopardy! Masters game #"
        */
        SHOW_NUMBER: Number(/#(\d+)/.exec(h1Text)![1]),
        AIRDATE: h1Text.split(" - ")[1],
        ROUNDS: [
            parseTableForRound("single", document.querySelector("div#jeopardy_round table.round")!),
            parseTableForRound("double", document.querySelector("div#double_jeopardy_round table.round")!),
        ],
        FINAL_JEOPARDY: {
            CATEGORY: finalJeopardyContainer.querySelector<HTMLTableCellElement>("td.category")!.innerText.trim(),
            QUESTION: finalJeopardyContainer.querySelector<HTMLElement>("td#clue_FJ")!.innerText,
            ANSWER: finalJeopardyContainer.querySelector<HTMLElement>("td#clue_FJ_r em.correct_response")!.innerText
        }
    };


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
                        rv.COMMENT_FROM_TV_SHOW_HOST = commentsString;
                    }
                    return rv;
                });


        /* Skip the first item in the list because it is the row of categories. */
        const clueRows = rows.slice(1);

        /** For Double Jeopardy, each dollar value is doubled. */
        const clueValueMultiplier: { [roundType in RoundType]: number } = {
            "single": 1,
            "double": 2
        };

        const clues = clueRows.map((clueRow: HTMLTableRowElement, rowIndex): Clue[] =>
            Array.from(clueRow.querySelectorAll<HTMLTableCellElement>("td.clue"))
                .map((tdClue: HTMLTableCellElement, categoryIndex): Clue => {

                    if (tdClue.childElementCount === 0) {
                        /* Clue was NOT revealed on the TV show */
                        return { REVEALED_ON_TV_SHOW: false };

                    } else {
                        /* Clue was revealed on the TV show */
                        const directChildrenRowsOfTdClue = tdClue.querySelectorAll(":scope>table>tbody>tr");
                        if (directChildrenRowsOfTdClue.length !== 2) {
                            throw new Error(`the td.clue has ${directChildrenRowsOfTdClue.length} trs, expected exactly 2`);
                        }
                        const childRow = directChildrenRowsOfTdClue[1];

                        /* Text which is shown on screen and the game host reads out loud. */
                        const question = childRow.querySelector<HTMLTableCellElement>('td.clue_text:not([display="none"])')!.innerText;

                        /* If a player says this, they get the money. */
                        const answer = childRow.querySelector<HTMLTableCellElement>("td.clue_text em.correct_response")!.innerText;

                        return {
                            REVEALED_ON_TV_SHOW: true,
                            QUESTION: question,
                            ANSWER: answer,
                            ROW_INDEX: rowIndex,
                            COLUMN_INDEX: categoryIndex,
                            VALUE: (rowIndex + 1) * 200 * clueValueMultiplier[roundType],
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

    const outputString =
        `
        import { Game } from "./typesForGame";
        export const SCRAPED_GAME: Game =
        ${JSON.stringify(result, null, 2)};
        `;

    /*
    For security, web browsers restrict when Javascript can write to the 
    computer's clipboard.
    
    If you run the scraper from a bookmarklet, the clipboard write will work
    because the user clicked on something to trigger the write.
    
    If you run the scraper by pasting code into the developer console, the
    clipboard write will fail:
    - Firefox says "Clipboard write was blocked due to lack of user activation."
    - Chrome says "Document is not focused."

    https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText

    If the clipboard write fails then we'll try to open a popup window containing
    the output, which will probably also be blocked by the web browser. If opening
    a window fails then we'll just write the output to the console and notify the
    user using window.alert().
    */
    window.navigator.clipboard.writeText(outputString)
        .then(() => {
            /* The promise resolves once the clipboard's contents have been updated. */
            const successMessage = document.createElement("div");
            successMessage.innerHTML = "Success, copied the game from J-Archive to the clipboard. You can put it in scrapedGame.ts.";
            successMessage.style.fontSize = "30px";
            successMessage.style.fontWeight = "bold";
            successMessage.style.background = "green";
            successMessage.style.border = "1px solid lime";
            successMessage.style.borderRadius = "5px";
            successMessage.style.padding = "15px 20px";
            successMessage.style.position = "fixed";
            successMessage.style.top = "10px";
            successMessage.style.left = "10px";
            successMessage.style.maxWidth = "1090px";
            document.body.append(successMessage);
        })
        .catch((error: unknown) => {
            console.log(`Jeopardy scraper: clipboard write failed: ${String(error)}`);

            /* Try fallback of opening a popup window containing the output,
            which will probably also be blocked by the web browser. */
            const outputWindow = window.open("");
            if (outputWindow) {
                /*
                Set the window title.
                If you do
                    document.head.title = "abc";
                then it sets the title attribute of the <head> tag:
                   <head title="abc">
                */
                outputWindow.document.head.innerHTML = "<title>Jeopardy scraper output</title>";
                outputWindow.document.body.innerHTML = `<pre>${outputString}</pre>`;

            } else {
                console.log("Jeopardy scraper: tried to open a window but the window object was null.");

                /* Popup window didn't work, just write the output to the console and notify the user. */
                console.log("Jeopardy scraper output:");
                console.log(outputString);
                window.alert("Jeopardy scraper: the output was logged to the web browser console.");
            }

        });


}
main();
