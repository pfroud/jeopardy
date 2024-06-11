import { GameBoard } from "../GameBoard";
import { querySelectorAndCheck } from "../commonFunctions";
import { ScrapedClue, ScrapedRound } from "../gameTypes";
import { Operator } from "../operator/Operator";
import { SpecialCategory } from "../specialCategories";

export class Presentation {
    public readonly ALL_SLIDE_NAMES = new Set<string>();

    private readonly HEADER: HTMLElement; // there's no HTMLHeaderElement
    private readonly SPAN_CLUE_CATEGORY_IN_HEADER: HTMLSpanElement;
    private readonly SPAN_CLUE_MONEY_IN_HEADER: HTMLSpanElement;

    private readonly DIV_SLIDE_CLUE_QUESTION: HTMLDivElement;
    private readonly DIV_CLUE_CATEGORY_BIG: HTMLDivElement;
    private readonly DIV_CLUE_VALUE_BIG: HTMLDivElement;
    private readonly DIV_SLIDE_CLUE_ANSWER_TEXT: HTMLDivElement;

    private readonly DIV_SLIDE_ROUND_START: HTMLDivElement;

    private readonly DIV_BACKDROP_FOR_POPUPS: HTMLDivElement;
    private readonly DIV_SPECIAL_CATEGORY_POPUP: HTMLDivElement;

    private readonly DIV_PAUSED: HTMLDivElement;
    private readonly FOOTER: HTMLElement;
    private readonly PROGRESS_ELEMENT_FOR_STATE_MACHINE: HTMLProgressElement;
    private readonly PROGRESS_ELEMENT_FOR_GAME_TIMER: HTMLProgressElement;
    private readonly ALL_SLIDE_DIVS: { [slideName: string]: HTMLDivElement } = {};
    private visibleSlideDiv?: HTMLDivElement;

    private readonly CATEGORY_CAROUSEL_TABLE: HTMLTableElement;
    private readonly CATEGORY_CAROUSEL_CELLS: HTMLTableCellElement[];

    public constructor(operator: Operator) {
        this.HEADER = querySelectorAndCheck(document, "header");
        this.SPAN_CLUE_CATEGORY_IN_HEADER = querySelectorAndCheck(this.HEADER, "span#clue-category-in-header");
        this.SPAN_CLUE_MONEY_IN_HEADER = querySelectorAndCheck(this.HEADER, "span#clue-value-in-header");
        this.PROGRESS_ELEMENT_FOR_GAME_TIMER = querySelectorAndCheck(this.HEADER, "progress#game-timer");
        this.PROGRESS_ELEMENT_FOR_STATE_MACHINE = querySelectorAndCheck(this.HEADER, "progress#state-machine");

        this.DIV_SLIDE_ROUND_START = querySelectorAndCheck(document, "div#slide-round-start");

        this.DIV_SLIDE_CLUE_QUESTION = querySelectorAndCheck(document, "div#slide-clue-question");
        this.DIV_SLIDE_CLUE_ANSWER_TEXT = querySelectorAndCheck(document, "div#slide-clue-answer div#clue-answer-text");

        this.DIV_CLUE_CATEGORY_BIG = querySelectorAndCheck(document, "div#clue-category-big");
        this.DIV_CLUE_VALUE_BIG = querySelectorAndCheck(document, "div#clue-value-big");

        this.DIV_BACKDROP_FOR_POPUPS = querySelectorAndCheck(document, "div#special-category-backdrop");
        this.DIV_SPECIAL_CATEGORY_POPUP = querySelectorAndCheck(document, "div#special-category-popup");

        this.DIV_PAUSED = querySelectorAndCheck(document, "div#paused");

        this.FOOTER = querySelectorAndCheck(document, "footer");

        this.CATEGORY_CAROUSEL_TABLE = querySelectorAndCheck(document, "table#category-carousel");
        const categoryCarouselCells = this.CATEGORY_CAROUSEL_TABLE.querySelectorAll("td");
        if (categoryCarouselCells.length !== GameBoard.TABLE_COLUMN_COUNT) {
            throw new Error(`found ${categoryCarouselCells.length} category carousel cells, expected exactly ${GameBoard.TABLE_COLUMN_COUNT}`);
        }
        this.CATEGORY_CAROUSEL_CELLS = Array.from(categoryCarouselCells);


        this.initSlides();

        this.showSlide("slide-jeopardy-logo");
        operator.handlePresentationReady(this);

    }

    private initSlides(): void {

        // select divs where the id property starts with "slide-"
        document.querySelectorAll<HTMLDivElement>('div[id ^= "slide-"')
            .forEach(div => {
                this.ALL_SLIDE_NAMES.add(div.id);
                this.ALL_SLIDE_DIVS[div.id] = div;
            });
        Object.freeze(this.ALL_SLIDE_NAMES);
        Object.freeze(this.ALL_SLIDE_DIVS);

    }

    public getProgressElementForStateMachine(): HTMLProgressElement {
        return this.PROGRESS_ELEMENT_FOR_STATE_MACHINE;
    }

    public getProgressElementForGameTimer(): HTMLProgressElement {
        return this.PROGRESS_ELEMENT_FOR_GAME_TIMER;
    }

    public showSlide(slideName: string): void {
        if (this.ALL_SLIDE_NAMES.has(slideName)) {
            if (this.visibleSlideDiv) {
                /*
                The display style is set to "none" in the CSS file.
                When we remove the inline style, which was set to "block",
                the slide is hidden.
                */
                this.visibleSlideDiv.style.display = "";
            }
            const targetSlide: HTMLDivElement = this.ALL_SLIDE_DIVS[slideName];
            targetSlide.style.display = "block";
            this.visibleSlideDiv = targetSlide;
        } else {
            throw new RangeError(
                `slide name "${slideName}" not in known slides: ${Object.keys(this.ALL_SLIDE_DIVS).toString()}`
            );
        }
    }

    public setClue(clue: ScrapedClue, category: string, value: number): void {
        this.SPAN_CLUE_CATEGORY_IN_HEADER.innerHTML = category;
        this.SPAN_CLUE_MONEY_IN_HEADER.innerHTML = `$${value}`;

        this.DIV_CLUE_CATEGORY_BIG.innerHTML = category;
        this.DIV_CLUE_VALUE_BIG.innerHTML = `$${value}`;

        this.DIV_SLIDE_CLUE_QUESTION.innerHTML = clue.QUESTION;

        this.DIV_SLIDE_CLUE_ANSWER_TEXT.innerHTML = clue.ANSWER;
    }

    public fitClueQuestionToScreen(): void {
        /*
         Remove font-size in the inline style property on the div,
         which may have been set by a previous call to this method.
         */
        this.DIV_SLIDE_CLUE_QUESTION.style.fontSize = "";

        const heightOfMain = querySelectorAndCheck(document, "main").clientHeight;
        while (this.DIV_SLIDE_CLUE_QUESTION.clientHeight > heightOfMain) {
            const oldFontSizeString = window.getComputedStyle(this.DIV_SLIDE_CLUE_QUESTION).getPropertyValue("font-size");
            const oldFontSize = Number(oldFontSizeString.replace("px", ""));
            const newFontSize = oldFontSize - 10;

            // set font-size in the inline style property on the div
            this.DIV_SLIDE_CLUE_QUESTION.style.fontSize = `${newFontSize}px`;
        }
    }

    public setPaused(isPaused: boolean): void {
        this.DIV_PAUSED.style.display = isPaused ? "" : "none";
    }

    public setGameEndTeamRankingHtml(htmlString: string): void {
        querySelectorAndCheck(document, "div#slide-gameEnd-team-ranking-table div#team-ranking").innerHTML = htmlString;
    }

    public getDivForPieCharts(): HTMLDivElement {
        return querySelectorAndCheck(document, "div#slide-gameEnd-pie-charts div#pie-charts");
    }

    public getDivForLineChart(): HTMLDivElement {
        return querySelectorAndCheck(document, "div#slide-gameEnd-line-chart div#line-chart");
    }

    public getDivForLineChartLegend(): HTMLDivElement {
        return querySelectorAndCheck(document, "div#slide-gameEnd-line-chart div#line-chart-legend");
    }

    public hideHeaderAndFooter(): void {
        document.body.classList.add("hide-header-and-footer");
    }

    public showHeaderAndFooter(): void {
        document.body.classList.remove("hide-header-and-footer");
    }

    public minimizeHeader(): void {
        document.body.classList.add("showing-game-board");
    }

    public maximizeHeader(): void {
        document.body.classList.remove("showing-game-board");
    }

    public clearFooter(): void {
        this.FOOTER.innerHTML = "";
    }

    public appendTeamDivToFooter(divForTeam: HTMLDivElement): void {
        this.FOOTER.append(divForTeam);
    }

    public showSpecialCategoryPopup(specialCategory: SpecialCategory): void {

        querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-title").innerHTML = specialCategory.DISPLAY_NAME;
        querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-description").innerHTML = specialCategory.DESCRIPTION;
        if (specialCategory.EXAMPLE) {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.remove("no-example");
            querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-category").innerHTML = specialCategory.EXAMPLE.CATEGORY;
            querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-question").innerHTML = specialCategory.EXAMPLE.QUESTION;
            querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-example-answer").innerHTML = specialCategory.EXAMPLE.ANSWER;
        } else {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.add("no-example");
        }

        this.DIV_BACKDROP_FOR_POPUPS.className = "blurred";
        this.DIV_SPECIAL_CATEGORY_POPUP.classList.remove("offscreen-left");
        this.DIV_SPECIAL_CATEGORY_POPUP.classList.add("visible-centered");
    }

    public hideSpecialCategoryPopup(): void {
        this.DIV_BACKDROP_FOR_POPUPS.className = "not-blurred";
        this.DIV_SPECIAL_CATEGORY_POPUP.classList.remove("visible-centered");
        this.DIV_SPECIAL_CATEGORY_POPUP.classList.add("offscreen-left");
    }

    public getBuzzHistorySvg(): SVGSVGElement {
        return querySelectorAndCheck(document, "div#slide-buzz-history-chart svg");
    }

    public getGameBoardTable(): HTMLTableElement {
        return querySelectorAndCheck(document, "table#game-board");
    }

    public setCategoryCarouselRound(gameRound: ScrapedRound): void {
        const categories = gameRound.CATEGORIES;
        if (categories.length !== GameBoard.TABLE_COLUMN_COUNT) {
            throw new Error(`categories length is ${categories.length}, expected exactly ${GameBoard.TABLE_COLUMN_COUNT}`);
        }
        for (let i = 0; i < GameBoard.TABLE_COLUMN_COUNT; i++) {
            this.CATEGORY_CAROUSEL_CELLS[i].innerHTML = categories[i].NAME;
        }
    }

    public setCategoryCarouselIndex(n: number): void {
        this.CATEGORY_CAROUSEL_TABLE.setAttribute("data-show-category-index", String(n));
    }

    public setRoundStartText(message: string): void {
        this.DIV_SLIDE_ROUND_START.innerText = message;
    }
}