/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BuzzHistoryForClue, BuzzHistoryRecord, BuzzResult } from "./BuzzHistoryChart";
import { Operator } from "./operator/Operator";
import { specialCategories, SpecialCategory } from "./operator/specialCategories";

export class Clue {

    /** The phrase read aloud by the person operating the game */
    public readonly question: string;

    /** The correct response a player needs to say to get money */
    public readonly answer: string;

    public readonly value: number;
    public readonly airdate: Date;
    public readonly category: {
        title: string;
        specialCategory: SpecialCategory | null;
    }

    public readonly buzzHistory: BuzzHistoryForClue;

    public constructor(xhrResponse: string) {

        const parsedJson = JSON.parse(xhrResponse)[0];

        this.answer = parsedJson.answer.replace(/\\/g, "");
        this.question = parsedJson.question.replace(/\\/g, "");
        this.value = parsedJson.value;

        // example of what format the airdate is in: "2013-01-25T12:00:00.000Z"
        this.airdate = new Date(parsedJson.airdate);

        this.category = {
            title: parsedJson.category.title.replace(/\\/g, ""),
            specialCategory: null
        };

        this.checkSpecialCategory();

        this.buzzHistory = {
            records: getEmpty2DArray(Operator.teamCount),
            timestampWhenClueQuestionFinishedReading: NaN
        };

        function getEmpty2DArray(size: number): BuzzHistoryRecord<BuzzResult>[][] {
            // do not use Array.fill() because then every array element will refer to that argument
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
        const regex = /\b((this)|(these)|(her)|(his)|(she)|(he)|(here))\b/i;
        const result = regex.exec(this.question);

        if (result === null) {
            // didn't find any words to make bold
            return this.question;
        } else {
            const startIndex = result.index;
            const foundWord = result[0];

            return this.question.substring(0, startIndex)
                + '<span class="clue-keyword">' + foundWord + '</span>'
                + this.question.substring(startIndex + foundWord.length);
        }
    }

    public isValid(): boolean {
        return this.value !== null &&
            this.value > 0 &&
            this.question !== null &&
            this.question.length > 0 &&
            this.question !== "=" &&
            this.answer.length > 0 &&
            this.category !== null &&
            this.category.title.length > 0 &&
            this.category.title !== "=";
    }

    public hasMultimedia(): boolean {
        /*
        Some Jeopardy clues have audio or video, which are shown or played on the 
        TV show. The J Archive does not have the audio or video, so we need to
        skip those clues.
        */
        const question = this.question.toLowerCase();
        const termsForMultimedia = ["seen here", "heard here"];
        return termsForMultimedia.some(term => question.includes(term));
    }

    private checkSpecialCategory(): void {
        // search for the first one which matches
        for (const specialCategory of specialCategories) {
            if (specialCategory.categoryTitleMatches.test(this.category.title)) {
                this.category.specialCategory = specialCategory;
                return;
            }
        }
        this.category.specialCategory = null;
    }


}