type Game = {
    /** From game_id in URL */
    readonly J_ARCHIVE_GAME_ID: number;
    /** From the header in the webpage */
    readonly SHOW_NUMBER: number;
    readonly AIRDATE: string;
    readonly ROUNDS: Round[];
}

type RoundType = "single" | "double";
type Round = {
    readonly TYPE: RoundType;
    readonly CATEGORIES: Category[];
    /**
     * This 2D array follows the structure of an HTML table.
     * The first array index is the row index.
     * The second array index is the column index.
     * */
    readonly CLUES: ScrapedClue[][];
}

type Category = {
    readonly NAME: string;
    /** A few categories have a comment from the host explaining the meaning of the category name. */
    COMMENTS?: string;
}

type ScrapedClue = {
    readonly QUESTION: string;
    readonly ANSWER: string;
}

function main(): void {

    const h1Text = document.querySelector("h1")!.innerText;

    const result: Game = {
        J_ARCHIVE_GAME_ID: Number(window.location.search.replace("?game_id=", "")),
        SHOW_NUMBER: Number(h1Text?.match(/Show #(\d+)/)![1]),
        AIRDATE: h1Text.split(" - ")[1],
        ROUNDS: [
            parseTableForRound("single", document.querySelector<HTMLTableElement>("div#jeopardy_round table.round")!),
            parseTableForRound("double", document.querySelector<HTMLTableElement>("div#double_jeopardy_round table.round")!),
        ]
    };

    const outputWindow = window.open("");
    if (outputWindow) {
        /*
        Set the window title.
        If you do
            document.head.title = "abc";
        then it sets the title attribute of the <head> tag:
           <head title="abc">
        */
        outputWindow.document.head.innerHTML = "<title>Scraped</title>";
        outputWindow.document.body.innerHTML = `<pre style="color:white">${JSON.stringify(result, null, 2)}</pre>`;

    }

}
main();

function parseTableForRound(roundType: RoundType, table: HTMLTableElement): Round {

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
                    rv.COMMENTS = commentsString;
                }
                return rv;
            });


    const clueRows = rows.slice(1); //skip the first item in the list, it is the row of categories.

    const clues = clueRows.map((clueRow: HTMLTableRowElement, rowIndex): ScrapedClue[] =>
        Array.from(clueRow.querySelectorAll<HTMLTableCellElement>("td.clue")).map((tdClue: HTMLTableCellElement, categoryIndex): ScrapedClue => {
            const directChildrenRowsOfTdClue = tdClue.querySelectorAll(":scope>table>tbody>tr");
            if (directChildrenRowsOfTdClue.length !== 2) {
                throw new Error(`the td.clue has ${directChildrenRowsOfTdClue.length} trs, expected exactly 2`);
            }

            const childRow = directChildrenRowsOfTdClue[1];
            const question = childRow.querySelector<HTMLTableCellElement>('td.clue_text:not([display="none"])')!.innerText;
            const answer = childRow.querySelector<HTMLTableCellElement>("td.clue_text em.correct_response")!.innerText;

            return {
                QUESTION: question,
                ANSWER: answer
            };
        })

    );

    return {
        TYPE: roundType,
        CATEGORIES: categories,
        CLUES: clues
    };

}

