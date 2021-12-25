import { Clue } from "../interfaces.js";

interface Slides {
    [slideName: string]: JQuery<HTMLDivElement>;
}

export class Presentation {
    divCategoryInHeader: JQuery<HTMLDivElement>;
    divDollarsInHeader: JQuery<HTMLDivElement>;
    header: JQuery<HTMLElement>;
    divQuestion: JQuery<HTMLDivElement>;
    divCategoryBig: JQuery<HTMLDivElement>;
    divDollarsBig: JQuery<HTMLDivElement>;
    divClueAnswer: JQuery<HTMLDivElement>;
    divPaused: JQuery<HTMLDivElement>;
    footerTeams: JQuery<HTMLElement>;
    progress: JQuery<HTMLProgressElement>;
    slideDivs: Slides;
    visibleSlide?: JQuery<HTMLDivElement>;
    slideNames: string[];

    constructor() {
        this.divCategoryInHeader = $("header div#category");
        this.divDollarsInHeader = $("header div#dollars");
        this.header = $("header");

        this.divQuestion = $("div#clue-question");
        this.divCategoryBig = $("div#category-big");
        this.divDollarsBig = $("div#dollars-big");
        this.divClueAnswer = $("div#clue-answer");

        this.divPaused = $("div#paused");

        this.footerTeams = $("footer");

        this.progress = $("progress#countdown");


        this._initSlides();

        if (window.opener) {

            if (window.opener.operator) {
                this.showSlide("slide-jeopardy-logo");
                (window as any).opener.operator.handlePresentationReady(this);
            } else{
                $("<div>window.opener.operator is null</div>")
                    .css("background-color", "red")
                    .css("position", "absolute")
                    .css("font-size", "60px")
                    .css("top", "20px")
                    .css("padding", "5px 10px")
                    .appendTo("body");
            }
        } else {
            // todo instead of showing this error message, we should open operator.html then close this window.
            $("<div>window.opener is null</div>")
                .css("background-color", "red")
                .css("position", "absolute")
                .css("font-size", "60px")
                .css("top", "20px")
                .css("padding", "5px 10px")
                .appendTo("body");
        }
    }

    private _initSlides(): void {
        this.slideDivs = {};
        this.visibleSlide = undefined;

        this.slideNames = [];

        $<HTMLDivElement>('div[id ^= "slide-"').each((index: number, elem: HTMLDivElement) => {
            const id = elem.id;
            this.slideNames.push(id);
            this.slideDivs[id] = $<HTMLDivElement>(elem);
        });

    }

    public getProgressElement(): JQuery<HTMLProgressElement> {
        return this.progress;
    }

    public showSlide(slideName: string): void {
        if (this.slideNames.includes(slideName)) {
            this.visibleSlide && this.visibleSlide.hide();

            const targetSlide = this.slideDivs[slideName];
            targetSlide.show();

            this.visibleSlide = targetSlide;
        } else {
            throw new RangeError('slide name "' + slideName + '" not in known slides: ' + Object.keys(this.slideDivs));
        }
    }

    public setClueObj(clueObj: Clue): void {
        this.divCategoryInHeader.html(clueObj.category.title);
        this.divDollarsInHeader.html("$" + clueObj.value);

        this.divCategoryBig.html(clueObj.category.title);
        this.divDollarsBig.html("$" + clueObj.value);

        this.divQuestion.html(clueObj.question.replace(/\\/g, "")); //sometimes there's a stray backslash

        this.divClueAnswer.html("Answer:<p><div style=\"font-weight:bold\">"
            + clueObj.answer + "</div>");
    }

    public fitClueQuestionToScreen(): void {

        //remove the style tag which may have been set by previous call to this function
        this.divQuestion.css("font-size", "");

        const heightOfMain = $("main").height();

        while (this.divQuestion.height() > heightOfMain) {
            const newFontSize = getFontSize(this.divQuestion) - 10;
            this.divQuestion.css("font-size", newFontSize + "px");
        }

        function getFontSize(elem: JQuery<HTMLElement>) {
            return Number(elem.css("font-size").replace("px", ""));
        }
    }

    public setTeamsVisible(isVisible: boolean): void {
        this.footerTeams.toggle(isVisible);
    }

    public setPaused(isPaused: boolean): void {
        this.divPaused.toggle(isPaused);
    }

    public setGameEndMessage(message: string): void {
        $("div#slide-game-end div#team-ranking").html(message);
    }

    public headerShow(): void {
        this.header.show();
    }

    public headerHide(): void {
        this.header.hide();
    }

}