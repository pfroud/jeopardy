import { Axis, axisBottom } from "d3-axis";
import { ScaleLinear, scaleLinear } from "d3-scale";
import { select, Selection } from "d3-selection";
import { D3ZoomEvent, zoom, zoomIdentity } from "d3-zoom";
import { downloadSVG, createSvgElement, querySelectorAndCheck } from "./commonFunctions";
import { Team, TeamState } from "./Team";


/**
 * This is history of buzzes for one single clue.
 */
export interface BuzzHistoryForClue {
    /**
     * The first index of the array is the team index.
     * Each subarray is a list of records in the order they happened.
     */
    readonly RECORDS: BuzzHistoryRecord<BuzzResult>[][];
    timestampWhenClueQuestionFinishedReading: number;
}

/**
 * One BuzzHistoryRecord corresponds to one press of the physical buzzer button.
 */
export interface BuzzHistoryRecord<R extends BuzzResult> {
    startTimestamp: number;
    readonly RESULT: R;
}

export type BuzzResult = BuzzResultTooEarlyStartLockout | BuzzResultStartAnswer | BuzzResultIgnore;

/**
 * The team pressed their buzzer before the person operating the game finished reading the question out loud.
 * 
 * This buzz result happens when the team is in state "operator-is-reading-question".
 */
interface BuzzResultTooEarlyStartLockout {
    readonly TYPE: "too-early-start-lockout";
}

export type BuzzAnswerResult = "answeredRight" | "answeredWrongOrTimedOut";

/**
 * The team pressed their buzzer and their time to answer started.
 * 
 * This buzz result happens when the team is in state "can-answer".
 */
export interface BuzzResultStartAnswer {
    readonly TYPE: "start-answer";
    answerResult: BuzzAnswerResult;
    endTimestamp: number;
}

/**
 * The team pressed their buzzer but the buzzer didn't do anything.
 * 
 * This buzz result happens when the team is in any of these states:
 *   - "idle"
 *   - "answering"
 *   - "already-answered-this-clue"
 *   - "other-team-is-answering"
 */
interface BuzzResultIgnore {
    readonly TYPE: "ignored";
    readonly TEAM_STATE_WHY_IT_WAS_IGNORED: TeamState;
}

/**
 * An annotation is an arrow with text.
 */
interface Annotation {
    startTimestamp: number;
    endTimestamp: number;
    message: string;
    /**
     * If not defined, then this Annotation starts and ends in the 
     * same team.
     * If defined, then this Annotation starts in the specified team.
     */
    teamIndexWhereStartTimestampHappened?: number;
}

/**
 * The buzz history chart shows the buzzes each team made relative to when the human
 * operator finished reading the clue question.
 */
export class BuzzHistoryChart {

    private readonly SVG_MARGIN = {
        TOP: 20,
        LEFT: 20,
        RIGHT: 20,
        BOTTOM: 20
    } as const;

    private readonly LEGEND_HEIGHT = 30;
    private readonly LEGEND_PADDING = 60;

    private readonly SVG_WIDTH = 1000;

    // content means the SVG size minus the margins.
    private readonly CONTENT_WIDTH: number;
    private readonly CONTENT_HEIGHT: number;

    private static readonly ROW_HEIGHT = 50;
    private static readonly DOT_RADIUS = 5;
    private static readonly BAR_HEIGHT = BuzzHistoryChart.DOT_RADIUS * 2;
    private static readonly Y_POSITION_FOR_BARS = (BuzzHistoryChart.ROW_HEIGHT / 2) - (BuzzHistoryChart.BAR_HEIGHT / 2);

    private static readonly CLASS_NAME_FOR_BUZZER_PRESS = "buzzer-press";
    private static readonly CLASS_NAME_FOR_START_ANSWER = "start-answer";
    private static readonly CLASS_NAME_FOR_TOO_EARLY_START_LOCKOUT = "too-early-start-lockout";
    private static readonly CLASS_NAME_FOR_ANSWERED_RIGHT = "answered-right";
    private static readonly CLASS_NAME_FOR_ANSWERED_WRONG_OR_TIMED_OUT = "answered-wrong-or-timed-out";
    private static readonly CLASS_NAME_FOR_ANNOTATION_GROUP = "annotation";
    private static readonly CLASS_NAME_FOR_ANNOTATION_ARROW_PATH = "annotation-arrow-path";

    /**
     * Only show annotations within this time range of when the human operator finished
     * reading the clue question.
     */
    private static readonly ANNOTATION_RANGE_MILLISEC = 100;

    private static readonly ANNOTATION_ARROWHEAD_SIZE = 5;

    /**
     * The first index is the team index. Then the second list is annotations for that team.
     */
    private readonly ANNOTATIONS: Annotation[][] = [];

    /** We will show two SVGs, one in the operator window and one in the presentation window. */
    private readonly ALL_SVGS: SVGSVGElement[] = [];

    /**
     * A "scale" does linear interpolation to convert a domain to a range.
     * For us, the domain is time (in milliseconds) and the range is screen-space pixels.
    */
    private readonly SCALE_WITHOUT_ZOOM_TRANSFORM: ScaleLinear<number, number>; //only one, shared between all SVGs
    private scaleWithZoomTransform: ScaleLinear<number, number>;

    private readonly AXIS_GENERATOR: Axis<number>;
    private readonly LOCKOUT_DURATION_MILLISEC: number;
    private readonly ZOOM_CONTROLLER = zoom<SVGSVGElement, unknown>();

    /** The SVG in the operator window needs mouse listeners */
    private readonly SVG_IN_OPERATOR_WINDOW: Selection<SVGSVGElement, unknown, null, undefined>;

    private history: BuzzHistoryForClue | null = null;

    // one for each SVG
    private readonly X_AXIS_GROUPS = new Map<
        SVGSVGElement,
        Selection<SVGGElement, unknown, null, undefined>
    >;
    private readonly VERTICAL_GRIDLINE_GROUPS = new Map<
        SVGSVGElement,
        Selection<SVGGElement, unknown, null, undefined>
    >;
    private readonly VERTICAL_LINES_WHEN_OPERATOR_FINISHED_READING_QUESTION = new Map<SVGSVGElement, SVGLineElement>;

    /** One row for each team, in both SVGs */
    private readonly ROWS_ARRAY = new Map<
        SVGSVGElement,
        Selection<SVGGElement, unknown, null, undefined>[]
    >;
    private readonly TEAM_NAME_TEXT_ELEMENTS = new Map<SVGSVGElement, SVGTextElement[]>();


    public constructor(teams: Team[], lockoutDurationMillisec: number, svgInOperatorWindow: SVGSVGElement, svgInPresentationWindow: SVGSVGElement) {
        this.LOCKOUT_DURATION_MILLISEC = lockoutDurationMillisec;
        this.SVG_IN_OPERATOR_WINDOW = select(svgInOperatorWindow);

        const svgHeight = (teams.length * BuzzHistoryChart.ROW_HEIGHT) + this.SVG_MARGIN.TOP + this.SVG_MARGIN.BOTTOM + this.LEGEND_HEIGHT + this.LEGEND_PADDING;

        // Content excludes legend and axis
        this.CONTENT_WIDTH = this.SVG_WIDTH - this.SVG_MARGIN.LEFT - this.SVG_MARGIN.RIGHT;
        this.CONTENT_HEIGHT = svgHeight - this.SVG_MARGIN.TOP - this.SVG_MARGIN.BOTTOM - this.LEGEND_HEIGHT - this.LEGEND_PADDING;

        // The domain is set in the showNewHistory() function
        this.SCALE_WITHOUT_ZOOM_TRANSFORM = scaleLinear()
            .range([0, this.CONTENT_WIDTH]);

        // The scale with zoom transform is changed in the handleZoom() function
        this.scaleWithZoomTransform = this.SCALE_WITHOUT_ZOOM_TRANSFORM;

        this.AXIS_GENERATOR = axisBottom<number>(this.scaleWithZoomTransform)
            .tickSizeOuter(0)
            .tickFormat(n => `${n}ms`);

        this.ALL_SVGS = [svgInOperatorWindow, svgInPresentationWindow];
        for (const theSvg of this.ALL_SVGS) {
            theSvg.innerHTML = "";

            theSvg.setAttribute("width", String(this.SVG_WIDTH));
            theSvg.setAttribute("height", String(svgHeight));

            this.createLegend(theSvg);

            // the content group is everything except the axis
            const groupContent = createSvgElement("g");
            groupContent.id = "content";
            groupContent.setAttribute("transform", `translate(${this.SVG_MARGIN.LEFT}, ${this.SVG_MARGIN.TOP})`);
            theSvg.append(groupContent);

            const groupXAxis = createSvgElement("g");
            const d3SelectionOfGroupXAxis = select(groupXAxis);
            this.X_AXIS_GROUPS.set(theSvg, d3SelectionOfGroupXAxis);
            groupXAxis.id = "axis";
            groupXAxis.setAttribute("transform", `translate(${this.SVG_MARGIN.LEFT}, ${this.SVG_MARGIN.TOP + this.CONTENT_HEIGHT})`);
            theSvg.append(groupXAxis);

            const groupXGrid = createSvgElement("g");
            const d3SelectionOfGroupXGrid = select(groupXGrid);
            this.VERTICAL_GRIDLINE_GROUPS.set(theSvg, d3SelectionOfGroupXGrid);
            groupXGrid.id = "grid";
            groupXGrid.setAttribute("transform", `translate(${this.SVG_MARGIN.LEFT}, ${this.SVG_MARGIN.TOP + this.CONTENT_HEIGHT})`);
            theSvg.append(groupXGrid);

            const rowsGroup = createSvgElement("g");
            rowsGroup.id = "rows";
            groupContent.append(rowsGroup);

            this.ROWS_ARRAY.set(theSvg, []);
            this.TEAM_NAME_TEXT_ELEMENTS.set(theSvg, []);

            // Draw team name, horizontal line, and alternating shaded background
            for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {

                const group = createSvgElement("g");
                group.setAttribute("id", `team-index-${teamIndex}`);
                group.setAttribute("transform", `translate(0, ${BuzzHistoryChart.ROW_HEIGHT * teamIndex})`);
                rowsGroup.append(group);

                const shadedBackground = createSvgElement("rect");
                shadedBackground.classList.add(`row-shaded-background-${teamIndex % 2 === 0 ? "even" : "odd"}`);
                shadedBackground.setAttribute("x", "0");
                shadedBackground.setAttribute("y", "0");
                shadedBackground.setAttribute("width", String(this.CONTENT_WIDTH));
                shadedBackground.setAttribute("height", String(BuzzHistoryChart.ROW_HEIGHT));
                group.append(shadedBackground);

                const separatorLine = createSvgElement("line");
                separatorLine.classList.add("row-separator");
                separatorLine.setAttribute("x1", "0");
                separatorLine.setAttribute("y1", String(BuzzHistoryChart.ROW_HEIGHT));
                separatorLine.setAttribute("x2", String(this.CONTENT_WIDTH));
                separatorLine.setAttribute("y2", String(BuzzHistoryChart.ROW_HEIGHT));
                group.append(separatorLine);

                /*
                 The buzz history records should go underneath the team name,
                 so we need to add a group to hold the records BEFORE adding
                 the team name.
                 */
                const recordsGroup = createSvgElement("g");
                const rowsForThisSvg = this.ROWS_ARRAY.get(theSvg);
                if (!rowsForThisSvg) {
                    throw new Error("no rows for the svg!!");
                }
                rowsForThisSvg[teamIndex] = select(recordsGroup);
                recordsGroup.id = "records";
                group.append(recordsGroup);

                const textNode = createSvgElement("text");
                textNode.classList.add("team-name");
                textNode.setAttribute("x", "10");
                textNode.setAttribute("y", String(BuzzHistoryChart.ROW_HEIGHT / 2));
                textNode.setAttribute("dominant-baseline", "middle");
                textNode.innerHTML = teams[teamIndex].getTeamName();
                group.append(textNode);
                const teamNameTextElementsForThisSvg = this.TEAM_NAME_TEXT_ELEMENTS.get(theSvg);
                if (!teamNameTextElementsForThisSvg) {
                    throw new Error("array of SVG <text> elements for this SVG is null or undefined");
                }
                teamNameTextElementsForThisSvg.push(textNode);
            }

            const xPositionAtTimeZero = this.scaleWithZoomTransform(0);
            const verticalLine = createSvgElement("line");
            this.VERTICAL_LINES_WHEN_OPERATOR_FINISHED_READING_QUESTION.set(theSvg, verticalLine);
            verticalLine.classList.add("vertical-line");
            verticalLine.id = "operator-finished-reading-question";
            verticalLine.setAttribute("y1", "0");
            verticalLine.setAttribute("y2", String(this.CONTENT_HEIGHT));
            verticalLine.setAttribute("x1", String(xPositionAtTimeZero));
            verticalLine.setAttribute("x2", String(xPositionAtTimeZero));
            groupContent.append(verticalLine);


        }

        this.initPanZoomController();

        // The chart is drawn when showNewHistory() is called.

        querySelectorAndCheck(document, "button#download-svg-buzz-history-chart")
            .addEventListener("click", () => downloadSVG(this.SVG_IN_OPERATOR_WINDOW.node()!, "buzz history"));

    }

    public setTeamName(idx: number, name: string): void {
        this.ALL_SVGS.forEach(svg => {
            const teamNameTextElementsForThisSvg = this.TEAM_NAME_TEXT_ELEMENTS.get(svg);
            if (!teamNameTextElementsForThisSvg) {
                throw new Error("array of SVG <text> elements for this SVG is null or undefined");
            }
            teamNameTextElementsForThisSvg[idx].innerHTML = name;
        });
    }

    private createLegend(svgToCreateLegendIn: SVGSVGElement): void {
        const legendGroup = createSvgElement("g");
        legendGroup.id = "legend";
        legendGroup.setAttribute("transform", `translate(${this.SVG_MARGIN.LEFT}, ${this.SVG_MARGIN.TOP + this.CONTENT_HEIGHT + this.LEGEND_PADDING})`);

        const yPositionForText = 20;
        const yPositionForBottomRow = 25;

        const createText = (x: number, content: string): void => {
            const theText = createSvgElement("text");
            theText.setAttribute("x", String(x));
            theText.setAttribute("y", String(yPositionForText));
            theText.innerHTML = content;
            legendGroup.append(theText);
        };

        const createRect = (x: number, className: string): void => {
            const theRect = createSvgElement("rect");
            theRect.classList.add("buzz-record");
            theRect.classList.add(className);
            theRect.setAttribute("width", "100");
            theRect.setAttribute("height", String(BuzzHistoryChart.BAR_HEIGHT));
            theRect.setAttribute("x", String(x));
            theRect.setAttribute("y", String(yPositionForBottomRow));
            legendGroup.append(theRect);
        };

        const createCircle = (cx: number): void => {
            const theCircle = createSvgElement("circle");
            theCircle.classList.add(BuzzHistoryChart.CLASS_NAME_FOR_BUZZER_PRESS);
            theCircle.setAttribute("cx", String(cx));
            theCircle.setAttribute("cy", String(yPositionForBottomRow + (BuzzHistoryChart.DOT_RADIUS / 2)));
            theCircle.setAttribute("r", String(BuzzHistoryChart.DOT_RADIUS));
            legendGroup.append(theCircle);
        };

        const itemsCount = 4;
        const fractionOfWidth = this.CONTENT_WIDTH / itemsCount;

        const xPositionOfCircleLegendItem = 10;
        createText(xPositionOfCircleLegendItem, "Buzzer press");
        createCircle(xPositionOfCircleLegendItem + (BuzzHistoryChart.DOT_RADIUS / 2) + 4);


        const rectanglesToAdd = [
            { label: "Too early (lockout)", xOffsetToLookLinedUp: 4, className: BuzzHistoryChart.CLASS_NAME_FOR_TOO_EARLY_START_LOCKOUT },
            { label: "Answered wrong or timed out", xOffsetToLookLinedUp: 1, className: BuzzHistoryChart.CLASS_NAME_FOR_ANSWERED_WRONG_OR_TIMED_OUT },
            { label: "Answered right", xOffsetToLookLinedUp: 1, className: BuzzHistoryChart.CLASS_NAME_FOR_ANSWERED_RIGHT },
        ];

        for (let i = 0; i < rectanglesToAdd.length; i++) {
            const xPosition = fractionOfWidth * (i + 1);
            const rectToAdd = rectanglesToAdd[i];
            createText(xPosition, rectToAdd.label);
            createRect(xPosition + rectToAdd.xOffsetToLookLinedUp, rectToAdd.className);
        }

        svgToCreateLegendIn.append(legendGroup);
    }

    private static getClampedLineFunction(x1: number, y1: number, x2: number, y2: number):
        (zoomEvent: D3ZoomEvent<SVGSVGElement, unknown>) => number {
        return zoomEvent => {
            const linear = y1 + ((y2 - y1) / (x2 - x1)) * (zoomEvent.transform.k - x1);
            if (linear < y1) {
                return y1;
            } else if (linear > y2) {
                return y2;
            } else {
                return linear;
            }
        };
    }


    /** The input is the present zoom scale factor. The output is the tick count for the axis. */
    private readonly ZOOM_TO_AXIS_TICK_COUNT_FUNCTION = BuzzHistoryChart.getClampedLineFunction(
        4, 4,  // At 4x zoom and below, set the tick count to 4.
        6, 8   // At 6x zoom and above, set the tick count to 8.
    );

    /** The input is the present zoom scale factor. The output is opacity for the gridlines. */
    private readonly ZOOM_TO_GRIDLINE_OPACITY_FUNCTION = BuzzHistoryChart.getClampedLineFunction(
        20, 0.0, // At 20x zoom and below, set the grid opacity to 0.0.
        30, 1.0  // At 30x zoom and above, set the grid opacity to 1.0.
    );

    /** The input is the present zoom scale factor. The output is opacity for the annotations. */
    private readonly ZOOM_TO_ANNOTATION_OPACITY_FUNCTION = BuzzHistoryChart.getClampedLineFunction(
        2, 0.0, // At 2x zoom and below, set the annotation opacity to 0.0.
        4, 1.0  // At 4x zoom and above, set the annotation opacity to 1.0.
    );

    private initPanZoomController(): void {
        /*
        https://www.d3indepth.com/zoom-and-pan/
        https://observablehq.com/@d3/pan-zoom-axes
        https://gist.github.com/jgbos/9752277
        */
        const handleZoom = (zoomEvent: D3ZoomEvent<SVGSVGElement, unknown>): void => {

            this.scaleWithZoomTransform = zoomEvent.transform.rescaleX(this.SCALE_WITHOUT_ZOOM_TRANSFORM);

            this.redraw();

            /*
            To set how many ticks you want to be generated normally you would just call:
                myAxisGenerator.ticks(n)
            (It actually is only a hint to the tick algorithm, so it might not return
            exactly n ticks.)

            But if you zoom in enough, eventually it will produce ticks with non-
            integer, values which I don't want. Apparently the way around that is to
            get the ticks from the scale, filter it, then pass the result into the
            axis generator.

            Solution from here although due to a new D3 version it doesn't work exactly:
            https://stackoverflow.com/a/56821215/7376577
            */
            const ticksBeforeFilter = this.scaleWithZoomTransform.ticks(this.ZOOM_TO_AXIS_TICK_COUNT_FUNCTION(zoomEvent));
            const onlyIntegerTicks = ticksBeforeFilter.filter(n => Number.isInteger(n));
            this.AXIS_GENERATOR.tickValues(onlyIntegerTicks);

            // Set the scale which will be used by the axis generator
            this.AXIS_GENERATOR.scale(this.scaleWithZoomTransform);

            /*
            We are going to use one axis generator to draw two things:
                (1) the X axis
                (2) vertical grid lines.

            To do that we will change the tickSizeInner setting. The default
            is six which makes normal looking axis ticks. Then we set it to
            a negative number which makes the lines go up instead of down.

            The axis generator still generates text labels for the grid
            so those are hidden using CSS.
            */

            // Draw the X axis
            this.AXIS_GENERATOR.tickSizeInner(6);
            this.X_AXIS_GROUPS.forEach(xAxisGroup => {
                this.AXIS_GENERATOR(xAxisGroup);
                /*
                The domain is the horizontal line. Remove it because we added
                <line class="row-separator"> in the same place.
                */
                xAxisGroup.select("path.domain").remove();
            });

            // Draw vertical grid lines
            this.AXIS_GENERATOR.tickSizeInner(-this.CONTENT_HEIGHT);
            const gridOpacity = this.ZOOM_TO_GRIDLINE_OPACITY_FUNCTION(zoomEvent);
            this.VERTICAL_GRIDLINE_GROUPS.forEach(gridGroup => {
                this.AXIS_GENERATOR(gridGroup);
                /*
                The domain is the horizontal line. Remove it because we added
                <line class="row-separator"> in the same place.
                */
                gridGroup.select("path.domain").remove();
                gridGroup.attr("opacity", gridOpacity);
            });

            const annotationOpacity = this.ZOOM_TO_ANNOTATION_OPACITY_FUNCTION(zoomEvent);
            this.ALL_SVGS.forEach(
                svg => svg.querySelectorAll("g.annotation").forEach(
                    annotationGroup => annotationGroup.setAttribute("opacity", String(annotationOpacity)))
            );

        };

        this.ZOOM_CONTROLLER.on("zoom", handleZoom);

        // Apply the zoom controller to the SVG.
        this.ZOOM_CONTROLLER(this.SVG_IN_OPERATOR_WINDOW);
    }

    private calculateAnnotations(): void {
        if (!this.history) {
            throw new Error("called calculateAnnotations with no history");
        }

        // Find the first buzz from any team which started an answer.
        const answeringRecords = this.history.RECORDS.flat()
            .filter(record => record.RESULT.TYPE === "start-answer")
            .sort((a, b) => a.startTimestamp - b.startTimestamp);
        if (answeringRecords.length < 1) {
            return;
        }
        const firstAnswer = answeringRecords[0];

        for (let teamIdx = 0; teamIdx < this.history.RECORDS.length; teamIdx++) {

            // clear previous annotations
            this.ANNOTATIONS[teamIdx] = [];

            const records = this.history.RECORDS[teamIdx];

            /*
            Find buzzes which were too late.

            Find the EARLIEST record which is AFTER the operator finishing 
            reading the clue question, and within annotation range.
            */
            // eslint-disable-next-line @typescript-eslint/prefer-for-of
            for (let recordIdx = 0; recordIdx < records.length; recordIdx++) {
                const record = records[recordIdx];
                const difference = record.startTimestamp - firstAnswer.startTimestamp;
                if (
                    record.RESULT.TYPE === "ignored" // buzzes that happened when someone else was answering
                    && record.RESULT.TEAM_STATE_WHY_IT_WAS_IGNORED === "other-team-is-answering"
                    && difference <= BuzzHistoryChart.ANNOTATION_RANGE_MILLISEC
                ) {
                    this.ANNOTATIONS[teamIdx].push({
                        startTimestamp: firstAnswer.startTimestamp,
                        endTimestamp: record.startTimestamp,
                        message: `${difference} millisec too late`
                    });
                    break;
                }
            }

            /*
            Find buzzes which were too early.

            Find the LATEST record which is BEFORE the operator finishing 
            reading the clue question, and within the annotation range.
            */
            for (let recordIdx = records.length - 1; recordIdx >= 0; recordIdx--) {
                const record = records[recordIdx];
                if (
                    record.startTimestamp < 0
                    && record.startTimestamp >= -BuzzHistoryChart.ANNOTATION_RANGE_MILLISEC
                    && record.RESULT.TYPE === "too-early-start-lockout"
                ) {
                    this.ANNOTATIONS[teamIdx].push({
                        startTimestamp: record.startTimestamp,
                        endTimestamp: 0, //the time when the operator finished reading the clue question
                        message: `${-record.startTimestamp} millisec too early`
                    });
                    break;
                }
            }
        }


    }

    public showNewHistory(history: BuzzHistoryForClue): void {

        if (history.RECORDS.length === 0) {
            console.warn("array of buzz history records is empty");
            return;
        }

        this.history = history;

        /////////////////////////////////////////////////////////
        /////// Compute the time range for the X axis ///////////
        /////////////////////////////////////////////////////////

        const allTimestamps: number[] = [];

        // Change all the timestamps so time zero is when the operator finished reading the question.
        this.history.RECORDS.forEach(arrayOfRecordsForTeam => arrayOfRecordsForTeam.forEach(record => {
            record.startTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
            allTimestamps.push(record.startTimestamp);
            if (record.RESULT.TYPE === "start-answer") {
                record.RESULT.endTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
                allTimestamps.push(record.RESULT.endTimestamp);
            }
        }));

        const firstTimestamp = Math.min(...allTimestamps);
        const lastTimestamp = Math.max(...allTimestamps);

        this.calculateAnnotations();

        /*
        The first timestamp will be greater than zero if there were no early buzzes (because
        we previously changed all the timestamps to be relative to when the operator finished
        reading the question).
        In that case, the vertical bar for when the operator finished reading the
        question would be off screen on the left. So we will set the domain minimum to be a
        negative number, which will make the vertical bar be on the right of the labels.
        */
        const domainMinToUse = (firstTimestamp > 0) ? -(lastTimestamp / 10) : firstTimestamp;

        /*
        Add padding so the leftmost record doesn't overlap the label 
        and the rightmost record isn't exactly on the edge.
        */
        this.SCALE_WITHOUT_ZOOM_TRANSFORM.domain([domainMinToUse * 1.3, lastTimestamp * 1.1]);
        this.scaleWithZoomTransform.domain(this.SCALE_WITHOUT_ZOOM_TRANSFORM.domain());

        /*
        Reset the pan & zoom.
        Calling transform() fires a zoom event, which calls the redraw() method.
        */
        this.ZOOM_CONTROLLER.transform(this.SVG_IN_OPERATOR_WINDOW, zoomIdentity);

    }

    /**
     * Called from the handleZoom() function.
     * 
     * This function can also draw the chart for the first time.
     */
    private redraw(): void {

        const xPositionAtTimeZero = this.scaleWithZoomTransform(0);
        const lockoutBarWidth = this.scaleWithZoomTransform(this.LOCKOUT_DURATION_MILLISEC) - xPositionAtTimeZero;

        this.VERTICAL_LINES_WHEN_OPERATOR_FINISHED_READING_QUESTION.forEach(verticalLine => {
            verticalLine.setAttribute("x1", String(xPositionAtTimeZero));
            verticalLine.setAttribute("x2", String(xPositionAtTimeZero));
        });

        this.ROWS_ARRAY.forEach(rowsForSVG => {
            if (!this.history) {
                return;
            }

            this.history.RECORDS.forEach((recordsForTeam, teamIndex) => {

                const groupForTeam = rowsForSVG[teamIndex];

                /*
                For information about what .data().join() means:
                https://www.d3indepth.com/datajoins/
                https://observablehq.com/@d3/selection-join
                */

                // Draw bars for buzzes that were too early
                groupForTeam
                    .selectAll(`rect.${BuzzHistoryChart.CLASS_NAME_FOR_TOO_EARLY_START_LOCKOUT}`)
                    .data(recordsForTeam.filter(record => record.RESULT.TYPE === "too-early-start-lockout"))
                    .join("rect")
                    .classed("buzz-record", true)
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_TOO_EARLY_START_LOCKOUT, true)
                    .attr("x", d => this.scaleWithZoomTransform(d.startTimestamp))
                    .attr("y", BuzzHistoryChart.Y_POSITION_FOR_BARS)
                    .attr("width", lockoutBarWidth)
                    .attr("height", BuzzHistoryChart.BAR_HEIGHT);

                // Draw bars for when a team started answering
                groupForTeam
                    .selectAll(`rect.${BuzzHistoryChart.CLASS_NAME_FOR_START_ANSWER}`)
                    .data(
                        recordsForTeam.filter(
                            /*
                            Need to use a type predicate (aka "user-defined type guard") for
                            Typescript to be able to infer types from the array filter function.
                            https://stackoverflow.com/questions/65279417/typescript-narrow-down-type-based-on-class-property-from-filter-find-etc
                            https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
                            */
                            function (record: BuzzHistoryRecord<BuzzResult>): record is BuzzHistoryRecord<BuzzResultStartAnswer> {
                                return record.RESULT.TYPE === "start-answer";
                            }
                        )
                    )
                    .join("rect")
                    .classed("buzz-record", true)
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_START_ANSWER, true)
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_ANSWERED_RIGHT, d => d.RESULT.answerResult === "answeredRight")
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_ANSWERED_WRONG_OR_TIMED_OUT, d => d.RESULT.answerResult === "answeredWrongOrTimedOut")
                    .attr("x", d => this.scaleWithZoomTransform(d.startTimestamp))
                    .attr("y", BuzzHistoryChart.Y_POSITION_FOR_BARS)
                    .attr("width", d => this.scaleWithZoomTransform(d.RESULT.endTimestamp) - this.scaleWithZoomTransform(d.startTimestamp))
                    .attr("height", BuzzHistoryChart.BAR_HEIGHT);

                // Draw a dot for every time a team pressed a buzzer
                groupForTeam
                    .selectAll(`circle.${BuzzHistoryChart.CLASS_NAME_FOR_BUZZER_PRESS}`)
                    .data(recordsForTeam)
                    .join("circle")
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_BUZZER_PRESS, true)
                    .attr("cx", d => this.scaleWithZoomTransform(d.startTimestamp))
                    .attr("cy", BuzzHistoryChart.ROW_HEIGHT / 2)
                    .attr("r", BuzzHistoryChart.DOT_RADIUS);

                // Draw annotations
                const annotationForThisTeam = this.ANNOTATIONS[teamIndex];
                const annotationGroups = groupForTeam
                    .selectAll(`g.${BuzzHistoryChart.CLASS_NAME_FOR_ANNOTATION_GROUP}`)
                    .data(annotationForThisTeam)
                    .join("g")
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_ANNOTATION_GROUP, true);

                const arrowY = (BuzzHistoryChart.ROW_HEIGHT / 2) + BuzzHistoryChart.DOT_RADIUS + BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE + 2;

                const getSvgPathDataForAnnotationArrow = (d: Annotation): string => {
                    const scaledStartTimestamp = this.scaleWithZoomTransform(d.startTimestamp);
                    const scaledEndTimestamp = this.scaleWithZoomTransform(d.endTimestamp);

                    /*
                     The arrow we want to draw:

                     o  o                            o  o
                     | /                              \ |
                     |/                                \|
                     o----------------------------------o
                     |\                                /|
                     | \                              / |
                     o  o                            o  o

                    In the SVG path language:
                        M is move to
                        L is draw line to

                    It is case sensitive. The lowercase versions of those commands use
                    relative position, the uppercase versions use absolute position.

                    See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#path_commands
                     */


                    /*
                    Body of the arrow:

                    (x1, y1)                            (x2, y2)
                        o----------------------------------o
                    */
                    const body =
                        `M ${scaledStartTimestamp}, ${arrowY}\n` +
                        `L ${scaledEndTimestamp}, ${arrowY}`;

                    /*
                    Left arrow head:

                        o  (x1, y1)
                       /
                      /
                     o     (x2, y2)
                      \
                       \
                        o  (x3, y3)
                    */
                    const leftArrowHead =
                        `M ${scaledStartTimestamp + BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}, ${arrowY - BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}\n` +
                        `L ${scaledStartTimestamp}, ${arrowY}\n` +
                        `L ${scaledStartTimestamp + BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}, ${arrowY + BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}`;

                    /*
                    Left vertical tick:

                     o  (x1, y1)
                     |
                     |
                     o  (x2, y2)
                     |
                     |
                     o  (x3, y3)
                    */
                    const leftVerticalTick =
                        `M ${scaledStartTimestamp}, ${arrowY - BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}\n` +
                        `L ${scaledStartTimestamp}, ${arrowY}\n` +
                        `L ${scaledStartTimestamp}, ${arrowY + BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}`;


                    /*
                    Right arrow head:

                    o     (x1, y1)
                     \
                      \
                       o  (x2, y2)
                      /
                     /
                    o     (x3, y3)
                    */

                    const rightArrowHead =
                        `M ${scaledEndTimestamp - BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}, ${arrowY - BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}\n` +
                        `L ${scaledEndTimestamp}, ${arrowY}\n` +
                        `L ${scaledEndTimestamp - BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}, ${arrowY + BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}`;

                    /*
                    Right vertical tick:

                    o  (x1, y1)
                    |
                    |
                    o  (x2, y2)
                    |
                    |
                    o  (x3, y3)
                    */
                    const rightVerticalTick =
                        `M ${scaledEndTimestamp}, ${arrowY - BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}\n` +
                        `L ${scaledEndTimestamp}, ${arrowY}\n` +
                        `L ${scaledEndTimestamp}, ${arrowY + BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE}`;

                    return `${leftArrowHead}\n\n${leftVerticalTick}\n\n${body}\n\n${rightArrowHead}\n\n${rightVerticalTick}`;

                };

                annotationGroups
                    .selectAll(`path.${BuzzHistoryChart.CLASS_NAME_FOR_ANNOTATION_ARROW_PATH}`)
                    .data(annotationForThisTeam)
                    .join("path")
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_ANNOTATION_ARROW_PATH, true)
                    .attr("d", annotation => getSvgPathDataForAnnotationArrow(annotation));


                // draw annotation text
                annotationGroups
                    .selectAll("text")
                    .data(annotationForThisTeam)
                    .join("text")
                    .attr("x", d => this.scaleWithZoomTransform(d.startTimestamp) + BuzzHistoryChart.ANNOTATION_ARROWHEAD_SIZE + 2)
                    .attr("y", arrowY + 1)
                    .attr("font-size", "12")
                    .attr("dominant-baseline", "hanging")
                    .text(d => d.message);


            });

        });

    }

}
