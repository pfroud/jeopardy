import { Clue, Operator } from "../operator/Operator";

interface Slides {
    [slideName: string]: HTMLDivElement;
}

export class Presentation {
    public readonly slideNames: string[] = [];

    private readonly header: HTMLElement;
    private readonly spanClueCategoryInHeader: HTMLSpanElement;
    private readonly spanClueMoneyInHeader: HTMLSpanElement;
    private readonly spanClueAirdateInHeader: HTMLSpanElement;

    private readonly divSlideClueQuestion: HTMLDivElement;
    private readonly divClueCategoryBig: HTMLDivElement;
    private readonly divClueValueBig: HTMLDivElement;
    private readonly divClueAirdateBig: HTMLDivElement;
    private readonly divSlideClueAnswer: HTMLDivElement;

    private readonly divPaused: HTMLDivElement;
    private readonly footer: HTMLElement;
    private readonly progressElementForStateMachine: HTMLProgressElement;
    private readonly progressElementForGameTimer: HTMLProgressElement;
    private readonly slideDivs: Slides = {};
    private visibleSlide?: HTMLDivElement;

    constructor() {
        this.header = document.querySelector("header");
        this.spanClueCategoryInHeader = this.header.querySelector("span#clue-category-in-header");
        this.spanClueMoneyInHeader = this.header.querySelector("span#clue-value-in-header");
        this.spanClueAirdateInHeader = this.header.querySelector("span#clue-airdate-in-header");
        this.progressElementForGameTimer = this.header.querySelector("progress#game-timer");
        this.progressElementForStateMachine = this.header.querySelector("progress#state-machine");

        this.divSlideClueQuestion = document.querySelector("div#slide-clue-question");
        this.divSlideClueAnswer = document.querySelector("div#slide-clue-answer");

        this.divClueCategoryBig = document.querySelector("div#clue-category-big");
        this.divClueValueBig = document.querySelector("div#clue-value-big");
        this.divClueAirdateBig = document.querySelector("div#clue-airdate-big");

        this.divPaused = document.querySelector("div#paused");

        this.footer = document.querySelector("footer");

        this.initSlides();

        if (window.opener) {
            if ((window.opener as any).operator) {
                this.showSlide("slide-jeopardy-logo");
                ((window.opener as any).operator as Operator).handlePresentationReady(this);
            } else {
                this.createErrorOverlay("window.opener.operator is null");
            }
        } else {
            this.createErrorOverlay("window.opener is null");
        }
    }

    private createErrorOverlay(message: string) {
        const errorDiv = document.createElement("div");
        errorDiv.innerHTML = message;
        errorDiv.style.backgroundColor = "red";
        errorDiv.style.position = "absolute";
        errorDiv.style.fontSize = "60px";
        errorDiv.style.top = "20px";
        errorDiv.style.padding = "5px 10px";
        document.body.appendChild(errorDiv);
    }

    private initSlides(): void {

        // select divs where the id property starts with "slide-"
        document.querySelectorAll<HTMLDivElement>('div[id ^= "slide-"')
            .forEach(div => {
                this.slideNames.push(div.id);
                this.slideDivs[div.id] = div;
            });
        Object.freeze(this.slideNames);
        Object.freeze(this.slideDivs);

    }

    public getProgressElementForStateMachine(): HTMLProgressElement {
        return this.progressElementForStateMachine;
    }

    public getProgressElementForGameTimer(): HTMLProgressElement {
        return this.progressElementForGameTimer;
    }

    public showSlide(slideName: string): void {
        if (this.slideNames.includes(slideName)) {
            if (this.visibleSlide) {
                /*
                The display style is set to "none" in the CSS file.
                When we remove the inline style, which was set to "block",
                the slide is hidden.
                */
                this.visibleSlide.style.display = "";
            }
            const targetSlide = this.slideDivs[slideName];
            targetSlide.style.display = "block";
            this.visibleSlide = targetSlide;
        } else {
            throw new RangeError(`slide name "${slideName}" not in known slides: ${Object.keys(this.slideDivs)}`);
        }
    }

    public setClue(clueObject: Clue): void {
        this.spanClueCategoryInHeader.innerHTML = clueObject.category.title;
        this.spanClueMoneyInHeader.innerHTML = "$" + clueObject.value;
        this.spanClueAirdateInHeader.innerHTML = "(" + clueObject.airdateParsed.getFullYear() + ")";

        this.divClueCategoryBig.innerHTML = clueObject.category.title;
        this.divClueValueBig.innerHTML = "$" + clueObject.value;
        this.divClueAirdateBig.innerHTML = "Airdate: " + clueObject.airdateParsed.getFullYear();

        this.divSlideClueQuestion.innerHTML = clueObject.question;

        this.divSlideClueAnswer.innerHTML = `Answer:<p><div style="font-weight:bold">${clueObject.answer}</div>`;
    }

    public fitClueQuestionToScreen(): void {
        // remove font-size in the inline style property on the div, which may have been set by previous call to this function
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
        document.querySelector("div#slide-gameEnd-team-ranking-list div#team-ranking").innerHTML = htmlString;
    }

    public getDivForPieCharts(): HTMLDivElement {
        return document.querySelector("div#slide-gameEnd-pie-charts div#pie-charts");
    }

    public getDivForLineChart(): HTMLDivElement {
        return document.querySelector("div#slide-gameEnd-line-chart div#line-chart");
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

}