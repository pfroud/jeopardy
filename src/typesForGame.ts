import { SpecialCategory } from "./specialCategories";

export type Game = {
    /** From game_id in URL */
    readonly J_ARCHIVE_GAME_ID: number;
    /** From the header in the webpage */
    readonly SHOW_NUMBER: number;
    readonly AIRDATE: string;
    readonly ROUNDS: GameRound[];
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
    /** A few categories have a comment from the host explaining the meaning of the category name. */
    readonly COMMENT?: string;
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
