import { select, Selection } from "d3-selection";
import { ScaleLinear, scaleLinear } from "d3-scale";
import { Axis, axisBottom } from "d3-axis";
import { zoom, D3ZoomEvent, zoomIdentity } from "d3-zoom";
import { Team, TeamState } from "./Team";
import { createSvgElement } from "./common";


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
export interface BuzzHistoryRecord<R> {
    startTimestamp: number;
    readonly RESULT: R;
}

export type BuzzResult = BuzzResultTooEarlyStartLockout | BuzzResultStartAnswer | BuzzResultIgnore;

/**
 * The team buzzed before the person operating the game finished reading the question out loud.
 * 
 * This buzz result happens when the team is in state "operator-is-reading-question".
 */
interface BuzzResultTooEarlyStartLockout {
    readonly TYPE: "too-early-start-lockout";
}

/**
 * The team buzzed and their time to answer started.
 * 
 * This buzz result happens when the team is in state "can-answer".
 */
export interface BuzzResultStartAnswer {
    readonly TYPE: "start-answer";
    answeredCorrectly: boolean;
    endTimestamp: number;
}

/**
 * The team pressed the buzzer but the buzzer didn't do anything.
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

export class BuzzHistoryChart {

    private readonly SVG_MARGIN = {
        TOP: 20,
        LEFT: 20,
        RIGHT: 20,
        BOTTOM: 20
    } as const;

    private readonly LEGEND_HEIGHT = 30;
    private readonly LEGEND_PADDING = 40;

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
    private static readonly CLASS_NAME_FOR_ANSWERED_WRONG = "answered-wrong";

    private readonly ALL_SVGS: SVGSVGElement[] = [];

    /**
     * A "scale" does linear interpolation to convert a domain to a range.
     * For us, the domain is time (in milliseconds) and the range is screen-space pixels.
    */
    // shared between both SVGs
    private readonly SCALE_WITHOUT_ZOOM_TRANSFORM: ScaleLinear<number, number>;
    private scaleWithZoomTransform: ScaleLinear<number, number>;
    private readonly AXIS_GENERATOR: Axis<number>;
    private history: BuzzHistoryForClue | null = null;
    private readonly LOCKOUT_DURATION_MILLISEC: number;
    private readonly ZOOM_CONTROLLER = zoom<SVGSVGElement, unknown>();
    private readonly SVG_IN_OPERATOR_WINDOW: Selection<SVGSVGElement, unknown, null, undefined>;

    // one for each SVG
    private readonly X_AXIS_GROUPS = new Map<
        SVGSVGElement,
        Selection<SVGGElement, unknown, null, undefined>
    >;
    private readonly VERTICAL_LINES = new Map<SVGSVGElement, SVGLineElement>;
    private readonly ROWS_ARRAY = new Map<
        SVGSVGElement,
        Selection<SVGGElement, unknown, null, undefined>[]
    >;


    public constructor(teams: Team[], lockoutDurationMillisec: number, svgInOperatorWindow: SVGSVGElement, svgInPresentationWindow: SVGSVGElement) {
        this.LOCKOUT_DURATION_MILLISEC = lockoutDurationMillisec;
        this.SVG_IN_OPERATOR_WINDOW = select(svgInOperatorWindow);

        const svgWidth = 1000;
        const svgHeight = (teams.length * BuzzHistoryChart.ROW_HEIGHT) + this.SVG_MARGIN.TOP + this.SVG_MARGIN.BOTTOM + 30 + this.LEGEND_HEIGHT + this.LEGEND_PADDING;

        this.CONTENT_WIDTH = svgWidth - this.SVG_MARGIN.LEFT - this.SVG_MARGIN.RIGHT;
        this.CONTENT_HEIGHT = svgHeight - this.SVG_MARGIN.TOP - this.SVG_MARGIN.BOTTOM - this.LEGEND_HEIGHT - this.LEGEND_PADDING;

        // the domain is set in the setHistory() function
        this.SCALE_WITHOUT_ZOOM_TRANSFORM = scaleLinear()
            .range([0, this.CONTENT_WIDTH]);

        // the zoomed scale is changed in the handleZoom() function
        this.scaleWithZoomTransform = this.SCALE_WITHOUT_ZOOM_TRANSFORM;

        this.AXIS_GENERATOR = axisBottom<number>(this.scaleWithZoomTransform)
            .tickSizeOuter(0)
            .ticks(4)
            .tickFormat(n => `${n}ms`);

        this.ALL_SVGS = [svgInOperatorWindow, svgInPresentationWindow];
        for (const theSvg of this.ALL_SVGS) {

            theSvg.setAttribute("width", String(svgWidth));
            theSvg.setAttribute("height", String(svgHeight));

            this.createLegend(theSvg);

            // the content group is everything except the axis
            const groupContent = createSvgElement("g");
            groupContent.setAttribute("id", "content");
            groupContent.setAttribute("transform", `translate(${this.SVG_MARGIN.LEFT}, ${this.SVG_MARGIN.TOP})`);
            theSvg.append(groupContent);

            const groupXAxis = createSvgElement("g");
            const d3SelectionOfGroupXAxis = select(groupXAxis);
            this.X_AXIS_GROUPS.set(theSvg, d3SelectionOfGroupXAxis);
            groupXAxis.setAttribute("id", "axis");
            groupXAxis.setAttribute("transform", `translate(${this.SVG_MARGIN.LEFT}, ${this.CONTENT_HEIGHT})`);
            theSvg.appendChild(groupXAxis);
            this.AXIS_GENERATOR(d3SelectionOfGroupXAxis);

            const rowsGroup = createSvgElement("g");
            rowsGroup.setAttribute("id", "rows");
            groupContent.append(rowsGroup);

            this.ROWS_ARRAY.set(theSvg, []);

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
                group.appendChild(shadedBackground);

                const separatorLine = createSvgElement("line");
                separatorLine.classList.add("row-separator");
                separatorLine.setAttribute("x1", "0");
                separatorLine.setAttribute("y1", String(BuzzHistoryChart.ROW_HEIGHT));
                separatorLine.setAttribute("x2", String(this.CONTENT_WIDTH));
                separatorLine.setAttribute("y2", String(BuzzHistoryChart.ROW_HEIGHT));
                group.appendChild(separatorLine);

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
                recordsGroup.setAttribute("id", "records");
                group.append(recordsGroup);

                const textNode = createSvgElement("text");
                textNode.classList.add("team-name");
                textNode.setAttribute("x", "10");
                textNode.setAttribute("y", String(BuzzHistoryChart.ROW_HEIGHT / 2));
                textNode.setAttribute("dominant-baseline", "middle");
                textNode.innerHTML = `${teams[teamIndex].TEAM_NAME}`;
                group.appendChild(textNode);
            }

            const xPositionAtTimeZero = this.scaleWithZoomTransform(0);
            const verticalLine = createSvgElement("line");
            this.VERTICAL_LINES.set(theSvg, verticalLine);
            verticalLine.classList.add("vertical-line");
            verticalLine.setAttribute("id", "operator-finished-reading-question");
            verticalLine.setAttribute("y1", "0");
            verticalLine.setAttribute("y2", String(this.CONTENT_HEIGHT));
            verticalLine.setAttribute("x1", String(xPositionAtTimeZero));
            verticalLine.setAttribute("x2", String(xPositionAtTimeZero));
            groupContent.appendChild(verticalLine);


        }

        this.initPanZoomController();

    }

    private createLegend(svgToCreateLegendIn: SVGSVGElement): void {
        const legendGroup = createSvgElement("g");
        legendGroup.setAttribute("id", "legend");
        legendGroup.setAttribute("transform", `translate(${this.SVG_MARGIN.LEFT}, ${this.SVG_MARGIN.TOP + this.CONTENT_HEIGHT + this.LEGEND_PADDING})`);

        /*
            const background = createSvgElement("rect");
            background.setAttribute("width", String(this.CONTENT_WIDTH));
            background.setAttribute("height", String(this.LEGEND_HEIGHT));
            background.setAttribute("x", "0");
            background.setAttribute("y", "0");
            background.setAttribute("fill", "#ffdddd88");
            legendGroup.appendChild(background);
            */

        const yPositionForText = 20;
        const yPositionForBottomRow = 25;

        const createText = (x: number, content: string): void => {
            const theText = createSvgElement("text");
            theText.setAttribute("x", String(x));
            theText.setAttribute("y", String(yPositionForText));
            theText.innerHTML = content;
            legendGroup.appendChild(theText);
        };

        const createRect = (x: number, className: string): void => {
            const theRect = createSvgElement("rect");
            theRect.classList.add("buzz-record");
            theRect.classList.add(className);
            theRect.setAttribute("width", "100");
            theRect.setAttribute("height", String(BuzzHistoryChart.BAR_HEIGHT));
            theRect.setAttribute("x", String(x));
            theRect.setAttribute("y", String(yPositionForBottomRow));
            legendGroup.appendChild(theRect);
        };

        const createCircle = (cx: number): void => {
            const theCircle = createSvgElement("circle");
            theCircle.classList.add(BuzzHistoryChart.CLASS_NAME_FOR_BUZZER_PRESS);
            theCircle.setAttribute("cx", String(cx));
            theCircle.setAttribute("cy", String(yPositionForBottomRow + (BuzzHistoryChart.DOT_RADIUS / 2)));
            theCircle.setAttribute("r", String(BuzzHistoryChart.DOT_RADIUS));
            legendGroup.appendChild(theCircle);
        };

        const itemsCount = 4;
        const fractionOfWidth = this.CONTENT_WIDTH / itemsCount;

        const xPositionOfCircleLegendItem = 10;
        createText(xPositionOfCircleLegendItem, "Buzzer press");
        createCircle(xPositionOfCircleLegendItem + (BuzzHistoryChart.DOT_RADIUS / 2) + 4);


        const rectanglesToAdd = [
            { label: "Too early (lockout)", xOffsetToLookLinedUp: 4, className: BuzzHistoryChart.CLASS_NAME_FOR_TOO_EARLY_START_LOCKOUT },
            { label: "Answered right", xOffsetToLookLinedUp: 1, className: BuzzHistoryChart.CLASS_NAME_FOR_ANSWERED_RIGHT },
            { label: "Answered wrong", xOffsetToLookLinedUp: 1, className: BuzzHistoryChart.CLASS_NAME_FOR_ANSWERED_WRONG }
        ];

        for (let i = 0; i < rectanglesToAdd.length; i++) {
            const xPosition = fractionOfWidth * (i + 1);
            const rectToAdd = rectanglesToAdd[i];
            createText(xPosition, rectToAdd.label);
            createRect(xPosition + rectToAdd.xOffsetToLookLinedUp, rectToAdd.className);
        }

        svgToCreateLegendIn.appendChild(legendGroup);
    }

    private initPanZoomController(): void {
        /*
        https://www.d3indepth.com/zoom-and-pan/
        https://observablehq.com/@d3/pan-zoom-axes
        https://gist.github.com/jgbos/9752277
        */
        const handleZoom = (zoomEvent: D3ZoomEvent<SVGSVGElement, unknown>): void => {

            this.scaleWithZoomTransform = zoomEvent.transform.rescaleX(this.SCALE_WITHOUT_ZOOM_TRANSFORM);

            // Change the scale which will be used by the axis generator
            this.AXIS_GENERATOR.scale(this.scaleWithZoomTransform);

            this.X_AXIS_GROUPS.forEach(xAxisGroup => this.AXIS_GENERATOR(xAxisGroup));

            // Re-draw the buzz history diagram
            this.redraw();
        };

        this.ZOOM_CONTROLLER.on("zoom", handleZoom);

        this.ZOOM_CONTROLLER(this.SVG_IN_OPERATOR_WINDOW);
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

        // include time zero
        const allTimestamps: number[] = [0];

        // Change all the timestamps so time zero is when the operator finished reading the question.
        this.history.RECORDS.forEach(arrayOfRecordsForTeam => arrayOfRecordsForTeam.forEach(record => {
            record.startTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
            allTimestamps.push(record.startTimestamp);
            if (record.RESULT?.TYPE === "start-answer") {
                record.RESULT.endTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
                allTimestamps.push(record.RESULT.endTimestamp);
            }
        }));

        const firstTimestamp = Math.min(...allTimestamps);
        const lastTimestamp = Math.max(...allTimestamps);

        /*
        Add padding so the leftmost record doesn't overlap the label 
        and the rightmost record isn't exactly on the edge
        */
        // todo add padding on the left if the min timestamp is zero
        this.SCALE_WITHOUT_ZOOM_TRANSFORM.domain([firstTimestamp * 1.3, lastTimestamp * 1.1]);

        /*
        Reset the pan & zoom. Calling transform() fires a zoom event,
        which calls the redraw() method.
        */
        this.ZOOM_CONTROLLER.transform(this.SVG_IN_OPERATOR_WINDOW, zoomIdentity);

    }

    private redraw(): void {

        const xPositionAtTimeZero = this.scaleWithZoomTransform(0);
        const lockoutBarWidth = this.scaleWithZoomTransform(this.LOCKOUT_DURATION_MILLISEC) - xPositionAtTimeZero;

        this.VERTICAL_LINES.forEach(verticalLine => {
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
                    .data(recordsForTeam.filter(record => record.RESULT?.TYPE === "too-early-start-lockout"))
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
                            Need to use a type predicate (aka "user-defined type guard") for Typescript to
                            be able to inter types from the array filter function.
                            https://stackoverflow.com/questions/65279417/typescript-narrow-down-type-based-on-class-property-from-filter-find-etc
                            https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
                            */
                            function (record: BuzzHistoryRecord<BuzzResult>): record is BuzzHistoryRecord<BuzzResultStartAnswer> {
                                return record.RESULT?.TYPE === "start-answer";
                            }
                        )
                    )
                    .join("rect")
                    .classed("buzz-record", true)
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_START_ANSWER, true)
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_ANSWERED_RIGHT, d => d.RESULT.answeredCorrectly)
                    .classed(BuzzHistoryChart.CLASS_NAME_FOR_ANSWERED_WRONG, d => !d.RESULT.answeredCorrectly)
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
            });

        });



    }

}
