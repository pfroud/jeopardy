import { Operator } from "../operator/Operator";
import { Clue } from "../Clue";
import { SpecialCategory } from "../operator/specialCategories";

export class Presentation {
    public readonly allSlideNames = new Set<string>();

    private readonly header: HTMLElement; // there's no HTMLHeaderElement
    private readonly spanClueCategoryInHeader: HTMLSpanElement;
    private readonly spanClueMoneyInHeader: HTMLSpanElement;
    private readonly spanClueAirdateInHeader: HTMLSpanElement;

    private readonly divSlideClueQuestion: HTMLDivElement;
    private readonly divClueCategoryBig: HTMLDivElement;
    private readonly divClueValueBig: HTMLDivElement;
    private readonly divClueAirdateBig: HTMLDivElement;
    private readonly divSlideClueAnswerText: HTMLDivElement;

    private readonly divSpecialCategoryBackdrop: HTMLDivElement;
    private readonly divSpecialCategoryPopup: HTMLDivElement;

    private readonly divPaused: HTMLDivElement;
    private readonly footer: HTMLElement;
    private readonly progressElementForStateMachine: HTMLProgressElement;
    private readonly progressElementForGameTimer: HTMLProgressElement;
    private readonly allSlideDivs: { [slideName: string]: HTMLDivElement } = {};
    private visibleSlideDiv?: HTMLDivElement;

    constructor(operator: Operator) {
        this.header = document.querySelector("header");
        this.spanClueCategoryInHeader = this.header.querySelector("span#clue-category-in-header");
        this.spanClueMoneyInHeader = this.header.querySelector("span#clue-value-in-header");
        this.spanClueAirdateInHeader = this.header.querySelector("span#clue-airdate-in-header");
        this.progressElementForGameTimer = this.header.querySelector("progress#game-timer");
        this.progressElementForStateMachine = this.header.querySelector("progress#state-machine");

        this.divSlideClueQuestion = document.querySelector("div#slide-clue-question");
        this.divSlideClueAnswerText = document.querySelector("div#slide-clue-answer div#clue-answer-text");

        this.divClueCategoryBig = document.querySelector("div#clue-category-big");
        this.divClueValueBig = document.querySelector("div#clue-value-big");
        this.divClueAirdateBig = document.querySelector("div#clue-airdate-big");

        this.divSpecialCategoryBackdrop = document.querySelector("div#special-category-backdrop")
        this.divSpecialCategoryPopup = document.querySelector("div#special-category-popup")

        this.divPaused = document.querySelector("div#paused");

        this.footer = document.querySelector("footer");

        this.initSlides();

        this.showSlide("slide-jeopardy-logo");
        operator.handlePresentationReady(this);

    }

    private initSlides(): void {

        // select divs where the id property starts with "slide-"
        document.querySelectorAll<HTMLDivElement>('div[id ^= "slide-"')
            .forEach(div => {
                this.allSlideNames.add(div.id);
                this.allSlideDivs[div.id] = div;
            });
        Object.freeze(this.allSlideNames);
        Object.freeze(this.allSlideDivs);

    }

    public getProgressElementForStateMachine(): HTMLProgressElement {
        return this.progressElementForStateMachine;
    }

    public getProgressElementForGameTimer(): HTMLProgressElement {
        return this.progressElementForGameTimer;
    }

    public showSlide(slideName: string): void {
        if (this.allSlideNames.has(slideName)) {
            if (this.visibleSlideDiv) {
                /*
                The display style is set to "none" in the CSS file.
                When we remove the inline style, which was set to "block",
                the slide is hidden.
                */
                this.visibleSlideDiv.style.display = "";
            }
            const targetSlide: HTMLDivElement = this.allSlideDivs[slideName];
            targetSlide.style.display = "block";
            this.visibleSlideDiv = targetSlide;
        } else {
            throw new RangeError(`slide name "${slideName}" not in known slides: ${Object.keys(this.allSlideDivs)}`);
        }
    }

    public setClue(clue: Clue): void {
        this.spanClueCategoryInHeader.innerHTML = clue.category.title;
        this.spanClueMoneyInHeader.innerHTML = "$" + clue.value;
        this.spanClueAirdateInHeader.innerHTML = "(" + clue.airdate.getFullYear() + ")";

        this.divClueCategoryBig.innerHTML = clue.category.title;
        this.divClueValueBig.innerHTML = "$" + clue.value;
        this.divClueAirdateBig.innerHTML = "Airdate: " + clue.airdate.getFullYear();

        this.divSlideClueQuestion.innerHTML = clue.question;

        this.divSlideClueAnswerText.innerHTML = clue.answer;
    }

    public fitClueQuestionToScreen(): void {
        // remove font-size in the inline style property on the div, which may have been set by a previous call to this function
        this.divSlideClueQuestion.style.fontSize = "";

        const heightOfMain = document.querySelector("main").clientHeight;
        while (this.divSlideClueQuestion.clientHeight > heightOfMain) {
            const oldFontSizeString = window.getComputedStyle(this.divSlideClueQuestion).getPropertyValue("font-size");
            const oldFontSize = Number(oldFontSizeString.replace("px", ""));
            const newFontSize = oldFontSize - 10;

            // set font-size in the inline style property on the div
            this.divSlideClueQuestion.style.fontSize = newFontSize + "px";
        }
    }

    public setPaused(isPaused: boolean): void {
        this.divPaused.style.display = isPaused ? "" : "none";
    }

    public setTeamRankingHtml(htmlString: string): void {
        document.querySelector("div#slide-gameEnd-team-ranking-table div#team-ranking").innerHTML = htmlString;
    }

    public getDivForPieCharts(): HTMLDivElement {
        return document.querySelector("div#slide-gameEnd-pie-charts div#pie-charts");
    }

    public getDivForLineChart(): HTMLDivElement {
        return document.querySelector("div#slide-gameEnd-line-chart div#line-chart");
    }

    public getDivForLineChartLegend(): HTMLDivElement {
        return document.querySelector("div#slide-gameEnd-line-chart div#line-chart-legend");
    }

    public hideHeaderAndFooter(): void {
        document.body.className = "hide-header-and-footer";
    }

    public clearFooter(): void {
        this.footer.innerHTML = "";
    }

    public appendTeamDivToFooter(divForTeam: HTMLDivElement): void {
        this.footer.append(divForTeam);
    }

    public showSpecialCategoryPopup(specialCategory: SpecialCategory): void {

        this.divSpecialCategoryPopup.querySelector("#special-category-title").innerHTML = specialCategory.displayName;
        this.divSpecialCategoryPopup.querySelector("#special-category-description").innerHTML = specialCategory.description;
        if (specialCategory.example) {
            this.divSpecialCategoryPopup.querySelector("#special-category-example-category").innerHTML = specialCategory.example.category;
            this.divSpecialCategoryPopup.querySelector("#special-category-example-question").innerHTML = specialCategory.example.question;
            this.divSpecialCategoryPopup.querySelector("#special-category-example-answer").innerHTML = specialCategory.example.answer;
        }

        this.divSpecialCategoryBackdrop.className = "blurred";
        this.divSpecialCategoryPopup.className = "visible-centered";
    }

    public hideSpecialCategoryPopup(): void {
        this.divSpecialCategoryBackdrop.className = "not-blurred";
        this.divSpecialCategoryPopup.className = "offscreen-left";
    }

}