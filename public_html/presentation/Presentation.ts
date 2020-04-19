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
    slides: Slides;
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
            this.showSlide("jeopardy-logo");
            window.opener.operator.handlePresentationReady(this);
        } else {
            $("<div>window.opener is null</div>")
                .css("background-color", "red")
                .css("position", "absolute")
                .css("font-size", "60px")
                .css("top", "20px")
                .css("padding", "5px 10px")
                .appendTo("body");
        }
    }

    _initSlides(): void {
        this.slides = {};
        this.visibleSlide = undefined;

        const slideNames = this.slideNames = ["jeopardy-logo", "game-rules", "spinner",
            "clue-category-and-dollars", "clue-question", "clue-answer", "event-cost", "buzzer-test", "game-end"];

        slideNames.forEach(slideName => {
            this.slides[slideName] = $("div#slide-" + slideName);
        });

    }

    getProgressElement(): JQuery<HTMLProgressElement> {
        return this.progress;
    }

    showSlide(slideName: string): void {
        if (slideName in this.slides) {
            this.visibleSlide && this.visibleSlide.hide();

            const targetSlide = this.slides[slideName];
            targetSlide.show();

            this.visibleSlide = targetSlide;
        } else {
            throw new RangeError('slide name "' + slideName + 'not in known slides: ' + this.slides);
        }
    }

    setClueObj(clueObj: ClueObj): void {
        this.divCategoryInHeader.html(clueObj.category.title);
        this.divDollarsInHeader.html("$" + clueObj.value);

        this.divCategoryBig.html(clueObj.category.title);
        this.divDollarsBig.html("$" + clueObj.value);

        this.divQuestion.html(clueObj.question.replace(/\\/g, ""));

        this.divClueAnswer.html("Answer:<p><div style=\"font-weight:bold\">"
            + clueObj.answer + "</div>");
    }

    fitQuestionToScreen(): void {

        //remove the style tag which may have been set by previous call to this function
        this.divQuestion.css("font-size", "");

        const heightOfQuestionDiv = this.divQuestion.height();
        const heightOfMain = $("main").height();

        if (!heightOfMain || !heightOfQuestionDiv) {
            console.error("Couldn't get height of <main>");
            return;
        }

        while (heightOfQuestionDiv > heightOfMain) {
            const newFontSize = getFontSize(this.divQuestion) - 10;
            this.divQuestion.css("font-size", newFontSize + "px");
        }

        function getFontSize(elem: JQuery<HTMLElement>) {
            return Number(elem.css("font-size").replace("px", ""));
        }
    }

    setTeamsVisible(isVisible: boolean): void {
        this.footerTeams.toggle(isVisible);
    }

    setPaused(isPaused: boolean): void {
        this.divPaused.toggle(isPaused);
    }

    getTeamDiv(teamIdx: number): JQuery<HTMLDivElement> {
        // Only used to initialize the Teams. After that, get the reference from Team object.
        return $('div[data-team-index="' + teamIdx + '"]');
    }

    setGameEndMessage(message: string): void {
        $("div#slide-game-end div#team-ranking").html(message);
    }

    headerShow(): void {
        this.header.show();
    }

    headerHide(): void {
        this.header.hide();
    }

}