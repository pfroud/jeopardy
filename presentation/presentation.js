class Presentation {

    constructor() {
        this.divCategoryInHeader = $("header div#category");
        this.divDollarsInHeader = $("header div#dollars");

        this.divQuestion = $("div#clue");
        this.divCategoryBig = $("div#category-big");
        this.divDollarsBig = $("div#dollars-big");
        this.divPreQuestion = $("div#pre-question");
        this.divClueAnswer = $("div#clue-answer");

        this.divPaused = $("div#paused");

        this.footerTeams = $("footer");


        this._initSlides();

        if (window.opener) {
            window.opener.operatorInstance.handlePresentationReady(this);
        } else {
            console.warn("no window.opener");
        }
    }

    _initSlides() {
        this.slides = {};
        this.visibleSlide = null;

        var slideNames = ["jeopardyLogo", "gameRules", "spinner",
            "preQuestion", "clueQuestion", "clueAnswer", "eventCostChart"];
        slideNames.forEach(slideName => {
            var slideNameCap = capitalizeFirstLetter(slideName);
            this.slides[slideName] = $("div#slide" + slideNameCap);

            // Add method to self so you can call showSlideFoo() instead of showSlide("foo")
            // https://stackoverflow.com/a/32498473
            this["showSlide" + slideNameCap] = function () {
                this.showSlide(slideName);
            };
        });

        function capitalizeFirstLetter(str) {
            return str.charAt(0).toUpperCase() + str.substring(1);
        }
    }

    showSlide(slideName) {
        if (slideName in this.slides) {
            var targetSlide = this.slides[slideName];
            targetSlide.show();

            this.visibleSlide && this.visibleSlide.hide();
            this.visibleSlide = targetSlide;
        } else {
            throw 'slide name "' + slideName + 'not in known slides: ' + slides;
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
