import { GameBoard } from "../GameBoard";
import { querySelectorAndCheck } from "../commonFunctions";
import { Operator } from "../operator/Operator";
import { SpecialCategory } from "../specialCategories";
import { Clue, GameRound } from "../typesForGame";

export class Presentation {
    public readonly ALL_SLIDE_NAMES = new Set<string>();

    private readonly MAIN: HTMLElement; // there's no HTMLMainElement
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
    private readonly SPECIAL_CATEGORY_TITLE: HTMLElement;
    private readonly SPECIAL_CATEGORY_DESCRIPTION: HTMLElement;
    private readonly SPECIAL_CATEGORY_EXAMPLE_CATEGORY: HTMLElement;
    private readonly SPECIAL_CATEGORY_EXAMPLE_QUESTION: HTMLElement;
    private readonly SPECIAL_CATEGORY_EXAMPLE_ANSWER: HTMLElement;

    private readonly DIV_PAUSED: HTMLDivElement;
    private readonly FOOTER: HTMLElement;
    private readonly PROGRESS_ELEMENT_FOR_STATE_MACHINE: HTMLProgressElement;
    private readonly PROGRESS_ELEMENT_FOR_GAME_ROUND_TIMER: HTMLProgressElement;
    private readonly ALL_SLIDE_DIVS: { [slideName: string]: HTMLDivElement } = {};
    private visibleSlideDiv?: HTMLDivElement;

    private readonly DIV_GAME_END_TEAM_RANKING_TABLE: HTMLDivElement;
    private readonly DIV_GAME_END_PIE_CHART_CONTAINER: HTMLDivElement;
    private readonly DIV_GAME_END_LINE_CHART_CONTAINER: HTMLDivElement;
    private readonly DIV_GAME_END_LINE_CHART_LEGEND: HTMLDivElement;
    private readonly TABLE_GAME_BOARD: HTMLTableElement;
    private readonly SVG_BUZZ_HISTORY: SVGSVGElement;

    private readonly CATEGORY_CAROUSEL_TABLE: HTMLTableElement;
    private readonly CATEGORY_CAROUSEL_CELLS: HTMLTableCellElement[];

    public constructor(operator: Operator) {
        this.MAIN = querySelectorAndCheck(document, "main");
        this.HEADER = querySelectorAndCheck(document, "header");
        this.SPAN_CLUE_CATEGORY_IN_HEADER = querySelectorAndCheck(this.HEADER, "span#clue-category-in-header");
        this.SPAN_CLUE_MONEY_IN_HEADER = querySelectorAndCheck(this.HEADER, "span#clue-value-in-header");
        this.PROGRESS_ELEMENT_FOR_GAME_ROUND_TIMER = querySelectorAndCheck(this.HEADER, "progress#game-round-timer");
        this.PROGRESS_ELEMENT_FOR_STATE_MACHINE = querySelectorAndCheck(this.HEADER, "progress#state-machine");

        this.DIV_SLIDE_ROUND_START = querySelectorAndCheck(document, "div#slide-round-start");

        this.DIV_SLIDE_CLUE_QUESTION = querySelectorAndCheck(document, "div#slide-clue-question");
        this.DIV_SLIDE_CLUE_ANSWER_TEXT = querySelectorAndCheck(document, "div#slide-clue-answer div#clue-answer-text");

        this.DIV_CLUE_CATEGORY_BIG = querySelectorAndCheck(document, "div#clue-category-big");
        this.DIV_CLUE_VALUE_BIG = querySelectorAndCheck(document, "div#clue-value-big");

        this.DIV_BACKDROP_FOR_POPUPS = querySelectorAndCheck(document, "div#backdrop-for-popups");
        this.DIV_SPECIAL_CATEGORY_POPUP = querySelectorAndCheck(document, "div#special-category-popup");
        this.SPECIAL_CATEGORY_TITLE = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "span.popup-title");
        this.SPECIAL_CATEGORY_DESCRIPTION = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-popup-description");
        this.SPECIAL_CATEGORY_EXAMPLE_CATEGORY = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-popup-example-category");
        this.SPECIAL_CATEGORY_EXAMPLE_QUESTION = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-popup-example-question");
        this.SPECIAL_CATEGORY_EXAMPLE_ANSWER = querySelectorAndCheck(this.DIV_SPECIAL_CATEGORY_POPUP, "#special-category-popup-example-answer");

        this.DIV_GAME_END_TEAM_RANKING_TABLE = querySelectorAndCheck(document, "div#slide-gameEnd-team-ranking-table div#team-ranking");
        this.DIV_GAME_END_PIE_CHART_CONTAINER = querySelectorAndCheck(document, "div#slide-gameEnd-pie-charts div#pie-charts");
        this.DIV_GAME_END_LINE_CHART_CONTAINER = querySelectorAndCheck(document, "div#slide-gameEnd-line-chart div#line-chart");
        this.DIV_GAME_END_LINE_CHART_LEGEND = querySelectorAndCheck(document, "div#slide-gameEnd-line-chart div#line-chart-legend");

        this.SVG_BUZZ_HISTORY = querySelectorAndCheck(document, "div#slide-buzz-history-chart svg");

        this.TABLE_GAME_BOARD = querySelectorAndCheck(document, "table#game-board");

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
        operator.onPresentationReady(this);

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
        return this.PROGRESS_ELEMENT_FOR_GAME_ROUND_TIMER;
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

    public setClue(clue: Clue): void {
        this.SPAN_CLUE_CATEGORY_IN_HEADER.innerHTML = clue.CATEGORY_NAME;
        this.SPAN_CLUE_MONEY_IN_HEADER.innerHTML = `$${clue.VALUE}`;

        this.DIV_CLUE_CATEGORY_BIG.innerHTML = clue.CATEGORY_NAME;
        this.DIV_CLUE_VALUE_BIG.innerHTML = `$${clue.VALUE}`;

        this.DIV_SLIDE_CLUE_QUESTION.innerHTML = clue.QUESTION;

        this.DIV_SLIDE_CLUE_ANSWER_TEXT.innerHTML = clue.ANSWER;
    }

    public fitClueQuestionToWindow(): void {
        /*
         Remove font-size in the inline style property on the div,
         which may have been set by a previous call to this method.
         */
        this.DIV_SLIDE_CLUE_QUESTION.style.fontSize = "";

        const heightOfMain = this.MAIN.clientHeight;
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

        if (isPaused) {
            document.body.classList.add("paused");
        } else {
            document.body.classList.remove("paused");
        }

    }

    public setGameEndTeamRankingHtml(htmlString: string): void {
        this.DIV_GAME_END_TEAM_RANKING_TABLE.innerHTML = htmlString;
    }

    public getGameEndPieChartContainer(): HTMLDivElement {
        return this.DIV_GAME_END_PIE_CHART_CONTAINER;
    }

    public getGameEndLineChartContainer(): HTMLDivElement {
        return this.DIV_GAME_END_LINE_CHART_CONTAINER;
    }

    public getGameEndLineChartLegendContainer(): HTMLDivElement {
        return this.DIV_GAME_END_LINE_CHART_LEGEND;
    }

    public headerAndFooterHide(): void {
        document.body.classList.add("hide-header-and-footer");
    }

    public headerAndFooterShow(): void {
        document.body.classList.remove("hide-header-and-footer");
    }

    public headerMinimize(): void {
        document.body.classList.add("showing-game-board");
    }

    public headerMaximize(): void {
        document.body.classList.remove("showing-game-board");
    }

    public footerClear(): void {
        this.FOOTER.innerHTML = "";
    }

    public footerAppendTeamDiv(teamIndex: number, divForTeam: HTMLDivElement): void {
        this.FOOTER.append(divForTeam);
    }

    public specialCategoryPopupShow(specialCategory: SpecialCategory): void {

        this.SPECIAL_CATEGORY_TITLE.innerHTML = specialCategory.DISPLAY_NAME;
        this.SPECIAL_CATEGORY_DESCRIPTION.innerHTML = specialCategory.DESCRIPTION;
        if (specialCategory.EXAMPLE) {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.remove("no-example");
            this.SPECIAL_CATEGORY_EXAMPLE_CATEGORY.innerHTML = specialCategory.EXAMPLE.CATEGORY;
            this.SPECIAL_CATEGORY_EXAMPLE_QUESTION.innerHTML = specialCategory.EXAMPLE.QUESTION;
            this.SPECIAL_CATEGORY_EXAMPLE_ANSWER.innerHTML = specialCategory.EXAMPLE.ANSWER;
        } else {
            this.DIV_SPECIAL_CATEGORY_POPUP.classList.add("no-example");
        }

        this.DIV_BACKDROP_FOR_POPUPS.setAttribute("data-backdrop-state", "enabled");
        this.DIV_SPECIAL_CATEGORY_POPUP.setAttribute("data-popup-visibility", "visible");
    }

    public specialCategoryPopupHide(): void {
        this.DIV_BACKDROP_FOR_POPUPS.setAttribute("data-backdrop-state", "disabled");
        this.DIV_SPECIAL_CATEGORY_POPUP.setAttribute("data-popup-visibility", "hidden");
    }

    public getBuzzHistorySvg(): SVGSVGElement {
        return this.SVG_BUZZ_HISTORY;
    }

    public getGameBoardTable(): HTMLTableElement {
        return this.TABLE_GAME_BOARD;
    }

    public setCategoryCarouselGameRound(gameRound: GameRound): void {
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