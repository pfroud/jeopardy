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