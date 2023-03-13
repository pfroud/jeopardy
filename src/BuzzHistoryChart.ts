import { select, Selection } from "d3-selection";
import { ScaleLinear, scaleLinear } from "d3-scale";
import { Axis, axisBottom } from "d3-axis";
import { zoom, D3ZoomEvent } from "d3-zoom";
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

    private readonly MARGIN = {
        top: 20,
        left: 20,
        right: 20,
        bottom: 20
    };

    private static readonly ROW_HEIGHT = 50;
    private static readonly DOT_RADIUS = 5;
    private static readonly BAR_HEIGHT = BuzzHistoryChart.DOT_RADIUS * 2;
    private static readonly Y_POSITION_FOR_BARS = (BuzzHistoryChart.ROW_HEIGHT / 2) - (BuzzHistoryChart.BAR_HEIGHT / 2);

    private static readonly CLASS_NAME_FOR_BUZZER_PRESS = "buzzer-press";
    private static readonly CLASS_NAME_FOR_START_ANSWER = "start-answer";
    private static readonly CLASS_NAME_FOR_TOO_EARLY_START_LOCKOUT = "too-early-start-lockout";

    private readonly ALL_SVGS: SVGSVGElement[] = [];

    /**
     * A "scale" does linear interpolation to convert a domain to a range.
     * For us, the domain is time (in milliseconds) and the range is screen-space pixels.
    */
    // shared between both SVGs
    private readonly SCALE_INITIAL: ScaleLinear<number, number>;
    private scaleWithZoomTransform: ScaleLinear<number, number>;
    private readonly AXIS_GENERATOR: Axis<number>;
    private history: BuzzHistoryForClue | null = null;
    private readonly LOCKOUT_DURATION_MILLISEC: number;

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


    public constructor(teams: Team[], lockoutDurationMillisec: number, svgInOperator: SVGSVGElement, svgInPresentation: SVGSVGElement) {
        this.LOCKOUT_DURATION_MILLISEC = lockoutDurationMillisec;

        const svgWidth = 1000;
        const svgHeight = (teams.length * BuzzHistoryChart.ROW_HEIGHT) + this.MARGIN.top + this.MARGIN.bottom + 50;

        const contentWidth = svgWidth - this.MARGIN.left - this.MARGIN.right;
        const contentHeight = svgHeight - this.MARGIN.top - this.MARGIN.bottom;

        // the domain is set in the setHistory() function
        this.SCALE_INITIAL = scaleLinear()
            .range([0, contentWidth]);

        // the zoomed scale is changed in the handleZoom() function
        this.scaleWithZoomTransform = this.SCALE_INITIAL;

        this.AXIS_GENERATOR = axisBottom<number>(this.scaleWithZoomTransform)
            .tickSizeOuter(0)
            .ticks(4)
            .tickFormat(n => `${n}ms`);

        this.ALL_SVGS = [svgInOperator, svgInPresentation];
        for (const theSvg of this.ALL_SVGS) {

            this.createLegend(theSvg);

            theSvg.setAttribute("width", String(svgWidth));
            theSvg.setAttribute("height", String(svgHeight));

            // the content group is everything except the axis
            const groupContent = createSvgElement("g");
            groupContent.setAttribute("id", "content");
            groupContent.setAttribute("transform", `translate(${this.MARGIN.left}, ${this.MARGIN.top})`);
            theSvg.append(groupContent);

            const groupXAxis = createSvgElement("g");
            const d3SelectionOfGroupXAxis = select(groupXAxis);
            this.X_AXIS_GROUPS.set(theSvg, d3SelectionOfGroupXAxis);
            groupXAxis.setAttribute("id", "axis");
            groupXAxis.setAttribute("transform", `translate(${this.MARGIN.left}, ${contentHeight})`);
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
                shadedBackground.setAttribute("width", String(contentWidth));
                shadedBackground.setAttribute("height", String(BuzzHistoryChart.ROW_HEIGHT));
                group.appendChild(shadedBackground);

                const separatorLine = createSvgElement("line");
                separatorLine.classList.add("row-separator");
                separatorLine.setAttribute("x1", "0");
                separatorLine.setAttribute("y1", String(BuzzHistoryChart.ROW_HEIGHT));
                separatorLine.setAttribute("x2", String(contentWidth));
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
            verticalLine.setAttribute("y2", String(contentHeight));
            verticalLine.setAttribute("x1", String(xPositionAtTimeZero));
            verticalLine.setAttribute("x2", String(xPositionAtTimeZero));
            verticalLine.setAttribute("visibility", "hidden");
            groupContent.appendChild(verticalLine);


        }

        ///////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////// Pan & zoom //////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////

        /*
        https://www.d3indepth.com/zoom-and-pan/
        https://observablehq.com/@d3/pan-zoom-axes
        https://gist.github.com/jgbos/9752277
        */
        const handleZoom = (zoomEvent: D3ZoomEvent<SVGSVGElement, unknown>): void => {

            this.scaleWithZoomTransform = zoomEvent.transform.rescaleX(this.SCALE_INITIAL);

            // Change the scale which will be used by the axis generator
            this.AXIS_GENERATOR.scale(this.scaleWithZoomTransform);

            this.X_AXIS_GROUPS.forEach(xAxisGroup => this.AXIS_GENERATOR(xAxisGroup));

            // Re-draw the buzz history diagram
            this.redraw();
        };

        const zoomController = zoom<SVGSVGElement, unknown>()
            .on("zoom", handleZoom);

        const d3SelectionOfSvgElementInOperator = select(svgInOperator);
        zoomController(d3SelectionOfSvgElementInOperator);
    }

    public setHistory(history: BuzzHistoryForClue): void {

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
        this.SCALE_INITIAL.domain([firstTimestamp * 1.3, lastTimestamp * 1.1]);

        // Update the scale which the axis generator will use
        this.AXIS_GENERATOR.scale(this.scaleWithZoomTransform);

        this.X_AXIS_GROUPS.forEach(xAxisGroup => this.AXIS_GENERATOR(xAxisGroup));

        const xPositionAtTimeZero = this.SCALE_INITIAL(0);
        this.VERTICAL_LINES.forEach(verticalLine => {
            verticalLine.setAttribute("visibility", "visible");
            verticalLine.setAttribute("x1", String(xPositionAtTimeZero));
            verticalLine.setAttribute("x2", String(xPositionAtTimeZero));
        });

    }

    public redraw(): void {

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
                    .classed("answered-right", d => d.RESULT.answeredCorrectly)
                    .classed("answered-wrong", d => !d.RESULT.answeredCorrectly)
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
