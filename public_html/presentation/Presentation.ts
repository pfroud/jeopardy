import { Clue } from "../interfaces.js";

interface Slides {
    [slideName: string]: HTMLDivElement;
}

export class Presentation {
    divCategoryInHeader: HTMLDivElement;
    divDollarsInHeader: HTMLDivElement;
    header: HTMLElement;
    divQuestion: HTMLDivElement;
    divCategoryBig: HTMLDivElement;
    divDollarsBig: HTMLDivElement;
    divClueAnswer: HTMLDivElement;
    divPaused: HTMLDivElement;
    footerTeams: HTMLElement;
    progress: HTMLProgressElement;
    slideDivs: Slides;
    visibleSlide?: HTMLDivElement;
    slideNames: string[];

    constructor() {
        this.divCategoryInHeader = document.querySelector("header div#category");
        this.divDollarsInHeader = document.querySelector("header div#dollars");
        this.header = document.querySelector("header");

        this.divQuestion = document.querySelector("div#clue-question");
        this.divCategoryBig = document.querySelector("div#category-big");
        this.divDollarsBig = document.querySelector("div#dollars-big");
        this.divClueAnswer = document.querySelector("div#clue-answer");

        this.divPaused = document.querySelector("div#paused");

        this.footerTeams = document.querySelector("footer");

        this.progress = document.querySelector("progress#countdown");


        this._initSlides();

        if (window.opener) {

            if (window.opener.operator) {
                this.showSlide("slide-jeopardy-logo");
                window.opener.operator.handlePresentationReady(this);
            } else {
                const warningDiv = document.createElement("div");
                warningDiv.innerHTML = "window.opener.operator is null";
                warningDiv.style.backgroundColor = "red";
                warningDiv.style.position = "absolute";
                warningDiv.style.fontSize = "60px";
                warningDiv.style.top = "20px";
                warningDiv.style.padding = "5px 10px";
                document.body.appendChild(warningDiv);
            }
        } else {
            // todo instead of showing this error message, we should open operator.html then close this window.
            const warningDiv = document.createElement("div");
            warningDiv.innerHTML = "window.opener is null";
            warningDiv.style.backgroundColor = "red";
            warningDiv.style.position = "absolute";
            warningDiv.style.fontSize = "60px";
            warningDiv.style.top = "20px";
            warningDiv.style.padding = "5px 10px";
            document.body.appendChild(warningDiv);
        }
    }

    private _initSlides(): void {
        this.slideDivs = {};

        this.slideNames = [];

        document.querySelectorAll<HTMLDivElement>('div[id ^= "slide-"').forEach(elem => {
            const id = elem.id;
            this.slideNames.push(id);
            this.slideDivs[id] = elem;
        });

    }

    public getProgressElement(): HTMLProgressElement {
        return this.progress;
    }

    public showSlide(slideName: string): void {
        if (this.slideNames.includes(slideName)) {
            // display is set to none in the CSS file
            this.visibleSlide && (this.visibleSlide.style.display = "");

            const targetSlide = this.slideDivs[slideName];
            targetSlide.style.display = "block";

            this.visibleSlide = targetSlide;
        } else {
            throw new RangeError(`slide name "${slideName}" not in known slides: ${Object.keys(this.slideDivs)}`);
        }
    }

    public setClueObj(clueObj: Clue): void {
        this.divCategoryInHeader.innerHTML = clueObj.category.title;
        this.divDollarsInHeader.innerHTML = "$" + clueObj.value;

        this.divCategoryBig.innerHTML = clueObj.category.title;
        this.divDollarsBig.innerHTML = "$" + clueObj.value;

        this.divQuestion.innerHTML = clueObj.question;

        this.divClueAnswer.innerHTML = `Answer:<p><div style="font-weight:bold">${clueObj.answer}</div>`;
    }

    public fitClueQuestionToScreen(): void {

        //remove the style tag which may have been set by previous call to this function
        this.divQuestion.style.fontSize = "";

        const heightOfMain = document.querySelector("main").clientHeight;

        while (this.divQuestion.clientHeight > heightOfMain) {
            const newFontSize = getFontSize(this.divQuestion) - 10;
            this.divQuestion.style.fontSize = newFontSize + "px";
        }

        function getFontSize(elem: HTMLElement) {
            return Number(elem.style.fontSize.replace("px", ""));
        }
    }

    public setTeamsVisible(isVisible: boolean): void {
        this.footerTeams.style.display = isVisible ? "" : "none";
    }

    public setPaused(isPaused: boolean): void {
        this.divPaused.style.display = isPaused ? "" : "none";
    }

    public setGameEndMessage(message: string): void {
        document.querySelector("div#slide-game-end div#team-ranking").innerHTML = message;
    }

    public headerShow(): void {
        this.header.style.display = "";
    }

    public headerHide(): void {
        this.header.style.display = "none";
    }

}