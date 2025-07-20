import { GameBoard } from "./GameBoard";
import { Game, RoundType, GameRound } from "./typesForGame";

/*
This is a placeholder game.

To get a real game:
 - Go to https://j-archive.com
 - Choose a season
 - Choose a game
 - Run src/scraper/scraper.js in the web browser, it will write the result to the clipboard
 - Overwrite this file with the contents of the clipboard
*/

function getExampleGameRound(roundType: RoundType): GameRound {
    return {
        TYPE: roundType,
        CATEGORIES: Array.from({ length: GameBoard.TABLE_COLUMN_COUNT }, (_, catIdx) => ({ NAME: `Category ${catIdx + 1}` })),
        CLUES: Array.from({ length: GameBoard.TABLE_CLUE_ROW_COUNT }, (_, rowIdx) =>
            Array.from({ length: GameBoard.TABLE_COLUMN_COUNT }, (__, colIdx) => {
                const value = (rowIdx + 1) * 200 * GameBoard.GAME_ROUND_VALUE_MULTIPLIER[roundType];
                return {
                    REVEALED_ON_TV_SHOW: true,
                    QUESTION: `Category ${colIdx + 1} $${value} question`,
                    ANSWER: `Category ${colIdx + 1} $${value} answer`,
                    VALUE: value,
                    CATEGORY_NAME: `Category ${colIdx + 1}`,
                    ROW_INDEX: rowIdx,
                    COLUMN_INDEX: colIdx,
                };
            }))
    };
}

export const SCRAPED_GAME: Game = {
    J_ARCHIVE_GAME_ID: 0,
    SHOW_NUMBER: 0,
    AIRDATE: "Saturday, January 1, 2000",
    ROUNDS: [
        getExampleGameRound("single"),
        getExampleGameRound("double")
    ],
    FINAL_JEOPARDY: {
        CATEGORY: "Final Jeopardy category",
        QUESTION: "Final Jeopardy question",
        ANSWER: "Final Jeopardy answer",
    },
};
