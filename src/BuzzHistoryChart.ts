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
    readonly records: BuzzHistoryRecord<BuzzResult>[][];
    timestampWhenClueQuestionFinishedReading: number;
}

/**
 * One BuzzHistoryRecord corresponds to one press of the physical buzzer button.
 */
export interface BuzzHistoryRecord<R> {
    startTimestamp: number;
    readonly result: R;
}

export type BuzzResult = BuzzResultTooEarlyStartLockout | BuzzResultStartAnswer | BuzzResultIgnore;

/**
 * The team buzzed before the person operating the game finished reading the question out loud.
 * 
 * This buzz result happens when the team is in state "operator-is-reading-question".
 */
interface BuzzResultTooEarlyStartLockout {
    readonly type: "too-early-start-lockout";
}

/**
 * The team buzzed and their time to answer started.
 * 
 * This buzz result happens when the team is in state "can-answer".
 */
export interface BuzzResultStartAnswer {
    readonly type: "start-answer";
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
    readonly type: "ignored";
    readonly teamStateWhyItWasIgnored: TeamState;
}

export class BuzzHistoryChart {

    private readonly margin = {
        top: 20,
        left: 20,
        right: 20,
        bottom: 20
    };

    private static readonly rowHeight = 50;
    private static readonly dotRadius = 5;
    private static readonly barHeight = BuzzHistoryChart.dotRadius * 2;
    private static readonly yPositionForBars = (BuzzHistoryChart.rowHeight / 2) - (BuzzHistoryChart.barHeight / 2);

    private readonly allSVGs: SVGSVGElement[] = [];

    /**
     * A "scale" does linear interpolation to convert a domain to a range.
     * For us, the domain is time (in milliseconds) and the range is screen-space pixels.
    */
    // shared between both SVGs
    private readonly scaleInitial: ScaleLinear<number, number>;
    private scaleWithZoomTransform: ScaleLinear<number, number>;
    private readonly axisGenerator: Axis<number>;
    private history: BuzzHistoryForClue | null = null;
    private readonly lockoutDurationMillisec: number;

    // one for each SVG
    private readonly xAxisGroups = new Map<
        SVGSVGElement,
        Selection<SVGGElement, unknown, null, undefined>
    >;
    private readonly verticalLines = new Map<SVGSVGElement, SVGLineElement>;
    private readonly rowsArray = new Map<
        SVGSVGElement,
        Selection<SVGGElement, unknown, null, undefined>[]
    >;


    public constructor(teams: Team[], lockoutDurationMillisec: number, svgInOperator: SVGSVGElement, svgInPresentation: SVGSVGElement) {
        this.lockoutDurationMillisec = lockoutDurationMillisec;

        const svgWidth = 1300;
        const svgHeight = (teams.length * BuzzHistoryChart.rowHeight) + this.margin.top + this.margin.bottom + 50;

        const contentWidth = svgWidth - this.margin.left - this.margin.right;
        const contentHeight = svgHeight - this.margin.top - this.margin.bottom;

        // the domain is set in the setHistory() function
        this.scaleInitial = scaleLinear()
            .range([0, contentWidth]);

        // the zoomed scale is changed in the handleZoom() function
        this.scaleWithZoomTransform = this.scaleInitial;

        this.axisGenerator = axisBottom<number>(this.scaleWithZoomTransform)
            .tickSizeOuter(0)
            .tickFormat(n => `${n} ms`);

        this.allSVGs = [svgInOperator, svgInPresentation];
        for (const theSvg of this.allSVGs) {

            theSvg.setAttribute("width", String(svgWidth));
            theSvg.setAttribute("height", String(svgHeight));

            // the content group is everything except the axis
            const groupContent = createSvgElement("g");
            groupContent.setAttribute("id", "content");
            groupContent.setAttribute("transform", `translate(${this.margin.left}, ${this.margin.top})`);
            theSvg.append(groupContent);

            const groupXAxis = createSvgElement("g");
            const d3SelectionOfGroupXAxis = select(groupXAxis);
            this.xAxisGroups.set(theSvg, d3SelectionOfGroupXAxis);
            groupXAxis.setAttribute("id", "axis");
            groupXAxis.setAttribute("transform", `translate(${this.margin.left}, ${contentHeight})`);
            theSvg.appendChild(groupXAxis);
            this.axisGenerator(d3SelectionOfGroupXAxis);

            const rowsGroup = createSvgElement("g");
            rowsGroup.setAttribute("id", "rows");
            groupContent.append(rowsGroup);

            this.rowsArray.set(theSvg, []);

            // Draw team name, horizontal line, and alternating shaded background
            for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {

                const group = createSvgElement("g");
                group.setAttribute("id", `team-index-${teamIndex}`);
                group.setAttribute("transform", `translate(0, ${BuzzHistoryChart.rowHeight * teamIndex})`);
                rowsGroup.append(group);

                if (teamIndex % 2 === 0) {
                    const shadedBackground = createSvgElement("rect");
                    shadedBackground.classList.add("row-shaded-background");
                    shadedBackground.setAttribute("x", "0");
                    shadedBackground.setAttribute("y", "0");
                    shadedBackground.setAttribute("width", String(contentWidth));
                    shadedBackground.setAttribute("height", String(BuzzHistoryChart.rowHeight));
                    group.appendChild(shadedBackground);
                }

                const separatorLine = createSvgElement("line");
                separatorLine.classList.add("row-separator");
                separatorLine.setAttribute("x1", "0");
                separatorLine.setAttribute("y1", String(BuzzHistoryChart.rowHeight));
                separatorLine.setAttribute("x2", String(contentWidth));
                separatorLine.setAttribute("y2", String(BuzzHistoryChart.rowHeight));
                group.appendChild(separatorLine);

                /*
                 The buzz history records should go underneath the team name,
                 so we need to add a group to hold the records BEFORE adding
                 the team name.
                 */
                const recordsGroup = createSvgElement("g");
                const rowsForThisSvg = this.rowsArray.get(theSvg);
                if (!rowsForThisSvg) {
                    throw new Error("no rows for the svg!!");
                }
                rowsForThisSvg[teamIndex] = select(recordsGroup);
                recordsGroup.setAttribute("id", "records");
                group.append(recordsGroup);

                const textNode = createSvgElement("text");
                textNode.classList.add("team-name");
                textNode.setAttribute("x", "10");
                textNode.setAttribute("y", String(BuzzHistoryChart.rowHeight / 2));
                textNode.setAttribute("dominant-baseline", "middle");
                textNode.innerHTML = `${teams[teamIndex].teamName}`;
                group.appendChild(textNode);
            }

            const xPositionAtTimeZero = this.scaleWithZoomTransform(0);
            const verticalLine = createSvgElement("line");
            this.verticalLines.set(theSvg, verticalLine);
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

            this.scaleWithZoomTransform = zoomEvent.transform.rescaleX(this.scaleInitial);

            // Change the scale which will be used by the axis generator
            this.axisGenerator.scale(this.scaleWithZoomTransform);

            this.xAxisGroups.forEach(xAxisGroup => this.axisGenerator(xAxisGroup));

            // Re-draw the buzz history diagram
            this.redraw();
        };

        const zoomController = zoom<SVGSVGElement, unknown>()
            .on("zoom", handleZoom);

        const d3SelectionOfSvgElementInOperator = select(svgInOperator);
        zoomController(d3SelectionOfSvgElementInOperator);


    }

    public setHistory(history: BuzzHistoryForClue): void {

        if (history.records.length === 0) {
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
        this.history.records.forEach(arrayOfRecordsForTeam => arrayOfRecordsForTeam.forEach(record => {
            record.startTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
            allTimestamps.push(record.startTimestamp);
            if (record.result?.type === "start-answer") {
                record.result.endTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
                allTimestamps.push(record.result.endTimestamp);
            }
        }));

        const firstTimestamp = Math.min(...allTimestamps);
        const lastTimestamp = Math.max(...allTimestamps);

        /*
        Add padding so the leftmost record doesn't overlap the label 
        and the rightmost record isn't exactly on the edge
        */
        // todo add padding on the left if the min timestamp is zero
        this.scaleInitial.domain([firstTimestamp * 1.3, lastTimestamp * 1.1]);

        // Update the scale which the axis generator will use
        this.axisGenerator.scale(this.scaleWithZoomTransform);

        this.xAxisGroups.forEach(xAxisGroup => this.axisGenerator(xAxisGroup));

        const xPositionAtTimeZero = this.scaleInitial(0);
        this.verticalLines.forEach(verticalLine => {
            verticalLine.setAttribute("visibility", "visible");
            verticalLine.setAttribute("x1", String(xPositionAtTimeZero));
            verticalLine.setAttribute("x2", String(xPositionAtTimeZero));
        });

    }

    public redraw(): void {

        const xPositionAtTimeZero = this.scaleWithZoomTransform(0);
        const lockoutBarWidth = this.scaleWithZoomTransform(this.lockoutDurationMillisec) - xPositionAtTimeZero;

        this.verticalLines.forEach(verticalLine => {
            verticalLine.setAttribute("x1", String(xPositionAtTimeZero));
            verticalLine.setAttribute("x2", String(xPositionAtTimeZero));
        });

        this.rowsArray.forEach(rowsForSVG => {
            if (!this.history) {
                return;
            }

            this.history.records.forEach((recordsForTeam, teamIndex) => {

                const groupForTeam = rowsForSVG[teamIndex];

                /*
                For information about what .data().join() means:
                https://www.d3indepth.com/datajoins/
                https://observablehq.com/@d3/selection-join
                */


                // Draw bars for buzzes that were too early
                const classNameForTooEarly = "too-early-start-lockout";
                groupForTeam
                    .selectAll(`rect.${classNameForTooEarly}`)
                    .data(recordsForTeam.filter(record => record.result?.type === "too-early-start-lockout"))
                    .join("rect")
                    .classed("buzz-record", true)
                    .classed(classNameForTooEarly, true)
                    .attr("x", d => this.scaleWithZoomTransform(d.startTimestamp))
                    .attr("y", BuzzHistoryChart.yPositionForBars)
                    .attr("width", lockoutBarWidth)
                    .attr("height", BuzzHistoryChart.barHeight);

                // Draw bars for when a team started answering
                const classNameForStartAnswer = "start-answer";
                groupForTeam
                    .selectAll(`rect.${classNameForStartAnswer}`)
                    .data(
                        recordsForTeam.filter(
                            /*
                            Need to use a type predicate (aka "user-defined type guard") for Typescript to
                            be able to inter types from the array filter function.
                            https://stackoverflow.com/questions/65279417/typescript-narrow-down-type-based-on-class-property-from-filter-find-etc
                            https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
                            */
                            function (record: BuzzHistoryRecord<BuzzResult>): record is BuzzHistoryRecord<BuzzResultStartAnswer> {
                                return record.result?.type === "start-answer";
                            }
                        )
                    )
                    .join("rect")
                    .classed("buzz-record", true)
                    .classed(classNameForStartAnswer, true)
                    .classed("answered-right", d => d.result.answeredCorrectly)
                    .classed("answered-wrong", d => !d.result.answeredCorrectly)
                    .attr("x", d => this.scaleWithZoomTransform(d.startTimestamp))
                    .attr("y", BuzzHistoryChart.yPositionForBars)
                    .attr("width", d => this.scaleWithZoomTransform(d.result.endTimestamp) - this.scaleWithZoomTransform(d.startTimestamp))
                    .attr("height", BuzzHistoryChart.barHeight);

                // Draw a dot for every time a team pressed a buzzer
                const classNameForBuzzerPress = "buzzer-press";
                groupForTeam
                    .selectAll(`circle.${classNameForBuzzerPress}`)
                    .data(recordsForTeam)
                    .join("circle")
                    .classed(classNameForBuzzerPress, true)
                    .attr("cx", d => this.scaleWithZoomTransform(d.startTimestamp))
                    .attr("cy", BuzzHistoryChart.rowHeight / 2)
                    .attr("r", BuzzHistoryChart.dotRadius);
            });

        });



    }

}
