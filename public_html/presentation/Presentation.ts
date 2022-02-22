import { Clue } from "../operator/Operator.js";

interface Slides {
    [slideName: string]: HTMLDivElement;
}

export class Presentation {
    public readonly slideNames: string[] = [];
    private readonly divCategoryInHeader: HTMLDivElement;
    private readonly divDollarsInHeader: HTMLDivElement;
    private readonly header: HTMLElement;
    private readonly divQuestion: HTMLDivElement;
    private readonly divCategoryBig: HTMLDivElement;
    private readonly divDollarsBig: HTMLDivElement;
    private readonly divClueAnswer: HTMLDivElement;
    private readonly divPaused: HTMLDivElement;
    private readonly footer: HTMLElement;
    private readonly progressElementForStateMachine: HTMLProgressElement;
    private readonly progressElementForGameTimer: HTMLProgressElement;
    private readonly slideDivs: Slides = {};
    private visibleSlide?: HTMLDivElement;

    constructor() {
        this.divCategoryInHeader = document.querySelector("header div#category");
        this.divDollarsInHeader = document.querySelector("header div#dollars");
        this.header = document.querySelector("header");

        this.divQuestion = document.querySelector("div#clue-question");
        this.divCategoryBig = document.querySelector("div#category-big");
        this.divDollarsBig = document.querySelector("div#dollars-big");
        this.divClueAnswer = document.querySelector("div#clue-answer");

        this.divPaused = document.querySelector("div#paused");

        this.footer = document.querySelector("footer");

        this.progressElementForGameTimer = document.querySelector("progress#game-timer");
        this.progressElementForStateMachine = document.querySelector("progress#state-machine");


        this.initSlides();

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

    private initSlides(): void {

        document.querySelectorAll<HTMLDivElement>('div[id ^= "slide-"').forEach(elem => {
            const id = elem.id;
            this.slideNames.push(id);
            this.slideDivs[id] = elem;
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
                When we remove the inline style which was set to "block",
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

    public setPaused(isPaused: boolean): void {
        this.divPaused.style.display = isPaused ? "" : "none";
    }

    public setGameEndMessage(message: string): void {
        document.querySelector("div#slide-game-end div#team-ranking").innerHTML = message;
    }

    public hideHeaderAndFooter(): void {
        this.header.style.display = "none";
        this.footer.style.display = "none";
    }

    public clearFooter(): void {
        this.footer.innerHTML = "";
    }

    public appendTeamDivToFooter(divForTeam: HTMLDivElement): void {
        this.footer.append(divForTeam);
    }

}