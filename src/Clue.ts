import { specialCategories, SpecialCategory } from "./operator/specialCategories";

export class Clue {

    public readonly answer: string;
    public readonly question: string;
    public readonly value: number;
    public readonly airdateParsed: Date;
    public readonly category: {
        title: string,
        specialCategory: SpecialCategory | null;
    }

    constructor(xhrResponse: string) {
        const parsedJson = JSON.parse(xhrResponse);

        this.answer = parsedJson.answer.replace(/\\/g, "");
        this.question = parsedJson.question.replace(/\\/g, "");
        this.value = parsedJson.value;

        // example of what format the airdate is in: "2013-01-25T12:00:00.000Z"
        this.airdateParsed = new Date(parsedJson.airdate);

        this.category = {
            title: parsedJson.title.replace(/\\/g, ""),
            specialCategory: this.getSpecialCategory()
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

    private getSpecialCategory(): SpecialCategory | null {
        // search for the first one which matches
        for (let i = 0; i < specialCategories.length; i++) {
            const specialCategory = specialCategories[i];
            if (specialCategory.categoryNameMatches.test(this.answer)) {
                return specialCategory;
            }
        }
        return null;
    };


}