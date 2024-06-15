import { SpecialCategory } from "./specialCategories";

export type ScrapedGame = {
    /** From game_id in URL */
    readonly J_ARCHIVE_GAME_ID: number;
    /** From the header in the webpage */
    readonly SHOW_NUMBER: number;
    readonly AIRDATE: string;
    readonly ROUNDS: ScrapedRound[];
}

export type RoundType = "single" | "double";
export type ScrapedRound = {
    readonly TYPE: RoundType;
    readonly CATEGORIES: ScrapedCategory[];
    /**
     * This 2D array follows the structure of an HTML table.
     * The first array index is the row index.
     * The second array index is the column index.
     * */
    readonly CLUES: ScrapedClue[][];
}

export type ScrapedCategory = {
    readonly NAME: string;
    /** A few categories have a comment from the host explaining the meaning of the category name. */
    readonly COMMENTS?: string;
}

/**
 * A scraped clue does not have the value or category because those both come from array indexes.
 */
export type ScrapedClue = {
    readonly QUESTION: string;
    readonly ANSWER: string;
}

/**
 * A full clue is created only when the human operator clicks on a cell in
 * the game board table.
 */
export interface FullClue extends ScrapedClue {
    readonly VALUE: number;
    readonly CATEGORY_NAME: string;
    readonly SPECIAL_CATEGORY: SpecialCategory | null;
}
