/*
type Game = {
    jArchiveGameID: number;
    showNumber: number;
    date: string;
    rounds: Round[];
}

type RoundType = "single" | "double";
type Round = {
    type: RoundType;
    categories: Category[];
    clues: Clue[];
}

type Category = {
    name: string;
    comments: string | undefined;
}

type Clue = {
    categoryIndex: number;
    rowIndex: number;
    value: number;
    question: string;
    answer: string;
}


function main(): void {

    const h1Text = document.querySelector("h1")!.innerText;

    const result: Game = {
        jArchiveGameID: Number(window.location.search.replace("?game_id=", "")),
        showNumber: Number(h1Text?.match(/Show #(\d+)/)![1]),
        date: h1Text.split(" - ")[1],
        rounds: [
            parseTable("single", document.querySelector<HTMLTableElement>("div#jeopardy_round table.round")!),
            parseTable("double", document.querySelector<HTMLTableElement>("div#double_jeopardy_round table.round")!),
        ]
    };

    const newWindow = window.open("");
    if (newWindow) {
        //If you do
        //    document.head.title = "abc";
        //then the result is
        //   <head title="abc">
        newWindow.document.head.innerHTML = "<title>Scraped</title>";
        newWindow.document.body.innerHTML = `<pre style="color:white">${JSON.stringify(result, null, 2)}</pre>`;

    }

}
main();

function parseTable(type: RoundType, table: HTMLTableElement): Round {

    const rv: Round = {
        type: type,
        categories: [],
        clues: []
    };

    const rows = Array.from(table.querySelectorAll(":scope>tbody>tr"));
    if (rows.length !== 6) {
        throw new Error(`got ${rows.length} row(s), expected exactly 6`);
    }

    const categoryRow = rows[0];
    rv.categories =
        Array.from(categoryRow.querySelectorAll<HTMLTableCellElement>("td.category")).
            map(td => {
                const comments = td.querySelector<HTMLTableCellElement>("td.category_comments")!.innerText.trim();
                return {
                    name: td.querySelector<HTMLTableCellElement>("td.category_name")!.innerText,
                    comments: comments.length > 0 ? comments : undefined
                };
            });

    const clueRows = rows.slice(1);

    clueRows.forEach((clueRow, rowIndex) => {
        clueRow.querySelectorAll<HTMLTableCellElement>("td.clue").forEach(
            (tdClue, categoryIndex) => {

                // https://stackoverflow.com/a/17206138/7376577
                const directChildrenRowsOfTdClue = tdClue.querySelectorAll(":scope>table>tbody>tr");
                if (directChildrenRowsOfTdClue.length !== 2) {
                    throw new Error(`the td.clue has ${directChildrenRowsOfTdClue.length} trs, expected exactly 2`);
                }

                const headerRow = directChildrenRowsOfTdClue[0];
                const value = Number(headerRow.querySelector<HTMLTableCellElement>('table.clue_header td[class^="clue_value"]')!
                    .innerText.replace("$", "").replace("DD: ", "").replace(",", ""));

                const clueRow = directChildrenRowsOfTdClue[1];
                const question = clueRow.querySelector<HTMLTableCellElement>('td.clue_text:not([display="none"])')!.innerText;
                const answer = clueRow.querySelector<HTMLTableCellElement>("td.clue_text em.correct_response")!.innerText;

                rv.clues.push({
                    categoryIndex: categoryIndex,
                    rowIndex: rowIndex,
                    value: value,
                    question: question,
                    answer: answer
                });
            });
    });

    return rv;

}

*/