import { SpecialCategory } from "./specialCategories";

export type Game = {
    /** From game_id in URL */
    readonly J_ARCHIVE_GAME_ID: number;
    /** From the header in the webpage */
    readonly SHOW_NUMBER: number;
    readonly AIRDATE: string;
    readonly ROUNDS: GameRound[];
    readonly FINAL_JEOPARDY: FinalJeopardy;
}

export type RoundType = "single" | "double";

export type Clue = HiddenClue | RevealedClue;
export type GameRound = {
    readonly TYPE: RoundType;
    readonly CATEGORIES: Category[];
    /**
     * This 2D array follows the structure of an HTML table.
     * The first array index is the row index.
     * The second array index is the column index.
     * */
    readonly CLUES: Clue[][];
}

export type Category = {
    readonly NAME: string;
    /**
     * Some categories have comments. On J-Archive, text in a &lt;td class="category_comments"&gt; can be:
     * 
     * - Explanation or flavor from the TV show host. For example:
     *     - Explanation: for the category "4,4" Mayim added "the responses are two 4-letter words." (https://j-archive.com/showgame.php?game_id=7161)
     *     - Flavor: for the category "I got rhythm" Ken added "I, in fact, do not". (https://j-archive.com/showgame.php?game_id=8963)
     * - A pre-recorded video of someone presenting the category; all the clues in that category will
     *   also be presented in pre-recorded videos of those people. For example:
     *     - For the category "Franklin", a pre-recorded video of Michael Douglas saying "I'm Michael
     *       Douglas. I play Ben Franklin during his tumultuous years as diplomat in France, making
     *       friends and enemies." (https://j-archive.com/showgame.php?game_id=8942)
     * 
     * Most comments are said after the category on the TV show and appear under the category on J-Archive.
     * But some comments are in the reverse order, for example here Ken started "and finally, the satirical work
     * by Ambrose Bierce..." then read the title "definitions from The Devil's Dictionary". (https://j-archive.com/showgame.php?game_id=8855)
     * 
    */
    readonly COMMENT_FROM_TV_SHOW_HOST?: string;
    specialCategory?: SpecialCategory | undefined;
}

/** The clue was never revealed on the Jeopardy TV show, so J Archive does not have it. */
type HiddenClue = {
    readonly REVEALED_ON_TV_SHOW: false;
}

/**
 * This clue was revealed on the Jeopardy TV show, so J Archive also has it.
 * 
 * The value and category name are redundant because we could get them from the row/column indexes,
 * but it is much easier to include them here.
 * */
export type RevealedClue = {
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

export type FinalJeopardy = {
    readonly CATEGORY: string;
    readonly QUESTION: string;
    readonly ANSWER: string
};