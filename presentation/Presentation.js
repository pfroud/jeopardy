class Presentation {

    constructor() {
        this.divCategoryInHeader = $("header div#category");
        this.divDollarsInHeader = $("header div#dollars");

        this.divQuestion = $("div#clue-question");
        this.divCategoryBig = $("div#category-big");
        this.divDollarsBig = $("div#dollars-big");
        this.divClueAnswer = $("div#clue-answer");

        this.divPaused = $("div#paused");

        this.footerTeams = $("footer");


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

    _initSlides() {
        this.slides = {};
        this.visibleSlide = null;

        var slideNames = this.slideNames = ["jeopardy-logo", "game-rules", "spinner",
            "clue-category-and-dollars", "clue-question", "clue-answer", "event-cost", "buzzer-test", "game-end"];

        slideNames.forEach(slideName => {
            this.slides[slideName] = $("div#slide-" + slideName);
        });

    }

    showSlide(slideName) {
        if (slideName in this.slides) {
            this.visibleSlide && this.visibleSlide.hide();

            var targetSlide = this.slides[slideName];
            targetSlide.show();

            this.visibleSlide = targetSlide;
        } else {
            throw new RangeError('slide name "' + slideName + 'not in known slides: ' + slides);
        }
    }

    setClueObj(clueObj) {
        this.divCategoryInHeader.html(clueObj.category.title);
        this.divDollarsInHeader.html("$" + clueObj.value);

        this.divCategoryBig.html(clueObj.category.title);
        this.divDollarsBig.html("$" + clueObj.value);

        this.divQuestion.html(clueObj.question);

        this.divClueAnswer.html("Answer:<p><div style=\"font-weight:bold\">"
                + clueObj.answer + "</div>");
    }

    fitQuestionToScreen() {

        //remove the style tag which may have been set by previous call to this function
        this.divQuestion.css("font-size", "");

        const heightOfMain = $("main").height();

        while (this.divQuestion.height() > heightOfMain) {
            const newFontSize = getFontSize(this.divQuestion) - 10;
            this.divQuestion.css("font-size", newFontSize + "px");
        }

        function getFontSize(elem) {
            return Number(elem.css("font-size").replace("px", ""));
        }
    }

    setTeamsVisible(isVisible) {
        this.footerTeams.toggle(isVisible);
    }

    setPaused(isPaused) {
        this.divPaused.toggle(isPaused);
    }

    getTeamDiv(teamIdx) {
        // Only used to initialize the Teams. After that, get the reference from Team object.
        return $('div[data-team-index="' + teamIdx + '"]');
    }

}