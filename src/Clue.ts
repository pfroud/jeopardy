/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BuzzHistoryForClue, BuzzHistoryRecord, BuzzResult } from "./BuzzHistoryChart";
import { Operator } from "./operator/Operator";
import { specialCategories, SpecialCategory } from "./specialCategories";

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

        this.answer = cleanString(parsedJson.answer);
        this.question = cleanString(parsedJson.question);
        this.value = parsedJson.value;

        // example of what format the airdate is in: "2013-01-25T12:00:00.000Z"
        this.airdate = new Date(parsedJson.airdate);

        this.category = {
            title: cleanString(parsedJson.category.title),
            specialCategory: null
        };

        this.checkSpecialCategory();

        this.buzzHistory = {
            records: getEmpty2DArray(Operator.teamCount),
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

        function cleanString(rawString: string): string {
            const withoutBackslashes = rawString.replace(/\\/g, "");
            try {
                const decoded = decodeUTF8(withoutBackslashes);
                if (withoutBackslashes !== decoded) {
                    console.group("UTF-8 decode success");
                    console.log("Before:");
                    console.log(withoutBackslashes);
                    console.log("After:");
                    console.log(decoded);
                    console.groupEnd();
                }
                return decoded;
            } catch (error) {
                console.group("UTF-8 decode failed");
                console.warn("The error was:");
                console.warn(error);
                console.warn("The original response from JService was:");
                console.warn(xhrResponse);
                console.groupEnd();
                return withoutBackslashes;
            }
        }

        function decodeUTF8(rawString: string): string {

            /*
            Fixes strings like:
            "MÃ©lisande"       --> "Mélisande"
            "Ãle de la CitÃ©" --> "Île de la Cité"
            "lycÃ©e"           --> "lycée"
    
            But it does not work on:
            "espaãol"
            */

            // https://developer.chrome.com/blog/how-to-convert-arraybuffer-to-and-from-string/
            const arrayBuffer = new ArrayBuffer(rawString.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0, strLen = rawString.length; i < strLen; i++) {
                uint8Array[i] = rawString.charCodeAt(i);
            }

            const textDecoder = new TextDecoder("utf-8", { fatal: true });
            return textDecoder.decode(arrayBuffer);
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
        return this.question.replace(regex, '<span class="clue-keyword">$&</span>');

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