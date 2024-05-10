import { BuzzHistoryForClue, BuzzHistoryRecord, BuzzResult } from "./BuzzHistoryChart";
import { ScrapedClue } from "./games";
import { Operator } from "./operator/Operator";
import { specialCategories, SpecialCategory } from "./specialCategories";

export class JServiceClue {

    /** The phrase read aloud by the person operating the game */
    public readonly QUESTION: string;

    /** The correct response a player needs to say to get money */
    public readonly ANSWER: string;

    public readonly VALUE: number;
    // public readonly AIRDATE: Date;
    public readonly CATEGORY: {
        readonly TITLE: string;
        specialCategory: SpecialCategory | null
    };

    public readonly BUZZ_HISTORY: BuzzHistoryForClue;

    public constructor(operator: Operator, input: ScrapedClue, category: string, value: number) {

        this.ANSWER = input.answer;
        this.QUESTION = input.question;
        this.VALUE = value;

        // example of what format the airdate is in: "2013-01-25T12:00:00.000Z"
        // this.AIRDATE = new Date(parsedJson.airdate);

        this.CATEGORY = {
            TITLE: category,
            specialCategory: null
        };

        this.checkSpecialCategory();

        this.BUZZ_HISTORY = {
            RECORDS: getEmpty2DArray(operator.teamCount),
            timestampWhenClueQuestionFinishedReading: NaN
        };

        function getEmpty2DArray(size: number): BuzzHistoryRecord<BuzzResult>[][] {
            /*
             Do not use array.fill([]) because it creates one new empty array and sets
             all the elements to that empty array.
             */
            const rv = new Array<BuzzHistoryRecord<BuzzResult>[]>(size);
            for (let teamIdx = 0; teamIdx < size; teamIdx++) {
                rv[teamIdx] = [];
            }
            return rv;
        }

    }

    public getQuestionHtmlWithSubjectInBold(): string {
        /*
        The person reading the question out loud should emphasize the subject
        of the question. Look for words that are probably the subject and make them bold.
        \b means word boundary.
        */
        const regex = /\b((this)|(these)|(her)|(his)|(she)|(he)|(here))\b/ig;

        // "$&" is the matched substring
        return this.QUESTION.replace(regex, '<span class="clue-keyword">$&</span>');

    }

    public isValid(): boolean {
        return this.VALUE !== null &&
            this.VALUE > 0 &&
            this.QUESTION !== null &&
            this.QUESTION.length > 0 &&
            this.QUESTION !== "=" &&
            this.ANSWER.length > 0 &&
            this.CATEGORY !== null &&
            this.CATEGORY.TITLE.length > 0 &&
            this.CATEGORY.TITLE !== "=";
    }

    public hasMultimedia(): boolean {
        /*
        Some Jeopardy clues have audio or video, which are shown or played on the 
        TV show. The J Archive does not have the audio or video, so we need to
        skip those clues.
        */
        const question = this.QUESTION.toLowerCase();
        const termsForMultimedia = ["seen here", "heard here"];
        return termsForMultimedia.some(term => question.includes(term));
    }

    private checkSpecialCategory(): void {
        // search for the first one which matches
        for (const specialCategory of specialCategories) {
            if (specialCategory.CATEGORY_TITLE_MATCHES.test(this.CATEGORY.TITLE)) {
                this.CATEGORY.specialCategory = specialCategory;
                return;
            }
        }
        this.CATEGORY.specialCategory = null;
    }


}