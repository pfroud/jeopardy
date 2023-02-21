import { select, Selection } from "d3-selection";
import { ScaleLinear, scaleLinear } from "d3-scale";
import { Axis, axisBottom } from "d3-axis";
import { zoom, D3ZoomEvent } from "d3-zoom";
import { Team, TeamState } from "./Team";


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

function createSvgElement<K extends keyof SVGElementTagNameMap>(qualifiedName: K): SVGElementTagNameMap[K] {
    return document.createElementNS<K>("http://www.w3.org/2000/svg", qualifiedName);
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

    private readonly verticalLineWhenOperatorPressedSpace: SVGLineElement;

    /**
     * A "scale" does linear interpolation to convert a domain to a range.
     * For us, the domain is time (in milliseconds) and the range is screen-space pixels.
     */
    private readonly scaleInitial: ScaleLinear<number, number>;

    private scaleWithZoomTransform: ScaleLinear<number, number>;

    private readonly rowsArray: Selection<SVGGElement, unknown, null, undefined>[] = [];

    private readonly groupXAxis: SVGGElement;

    private readonly axisGenerator: Axis<number>;

    private readonly maxWidthOfTeamNameLabels: number;

    private history: BuzzHistoryForClue | null = null;

    private readonly lockoutDurationMillisec: number;

    public constructor(teams: Team[], svg: SVGSVGElement, lockoutDurationMillisec: number) {
        this.lockoutDurationMillisec = lockoutDurationMillisec;

        const svgWidth = 1300;
        const svgHeight = (teams.length * BuzzHistoryChart.rowHeight) + this.margin.top + this.margin.bottom + 50;

        svg.setAttribute("width", String(svgWidth));
        svg.setAttribute("height", String(svgHeight));

        const contentWidth = svgWidth - this.margin.left - this.margin.right;
        const contentHeight = svgHeight - this.margin.top - this.margin.bottom;

        // the content group is everything except the axis
        const groupContent = createSvgElement("g");
        groupContent.setAttribute("id", "content");
        groupContent.setAttribute("transform", `translate(${this.margin.left}, ${this.margin.top})`);
        svg.append(groupContent);

        this.groupXAxis = createSvgElement("g");
        this.groupXAxis.setAttribute("id", "axis");
        this.groupXAxis.setAttribute("transform", `translate(${this.margin.left}, ${contentHeight})`);
        svg.appendChild(this.groupXAxis);

        // the domain is set in the setHistory() function
        this.scaleInitial = scaleLinear()
            .range([0, contentWidth]);

        // the zoomed scale is changed in the handleZoom() function
        this.scaleWithZoomTransform = this.scaleInitial;

        this.axisGenerator = axisBottom<number>(this.scaleWithZoomTransform)
            .tickSizeOuter(0)
            .tickFormat(n => `${n} ms`);

        const d3SelectionOfGroupXAxis = select(this.groupXAxis);
        this.axisGenerator(d3SelectionOfGroupXAxis);

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

            // Re-draw the axis
            this.axisGenerator(d3SelectionOfGroupXAxis);

            // Re-draw the buzz history diagram
            this.redraw();
        };

        const zoomController = zoom<SVGSVGElement, unknown>()
            .on("zoom", handleZoom);

        const d3SelectionOfSvgElement = select(svg);
        zoomController(d3SelectionOfSvgElement);

        /////////////////////////////////////////////////////////
        ////////////// Draw the diagram contents ////////////////
        /////////////////////////////////////////////////////////

        const rowsGroup = createSvgElement("g");
        rowsGroup.setAttribute("id", "rows");
        groupContent.append(rowsGroup);

        let maxTextWidth = -Infinity;

        // Draw team name, horizontal line, and alternating shaded background
        for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {

            const group = createSvgElement("g");
            group.setAttribute("id", `team-index-${teamIndex}`);
            group.setAttribute("transform", `translate(0, ${BuzzHistoryChart.rowHeight * teamIndex})`);
            rowsGroup.append(group);

            if (teamIndex % 2 === 0) {
                const shadedBackground = createSvgElement("rect");
                shadedBackground.setAttribute("x", "0");
                shadedBackground.setAttribute("y", "0");
                shadedBackground.setAttribute("width", String(contentWidth));
                shadedBackground.setAttribute("height", String(BuzzHistoryChart.rowHeight));
                shadedBackground.setAttribute("fill", "#eee");
                group.appendChild(shadedBackground);
            }

            const separatorLine = createSvgElement("line");
            separatorLine.setAttribute("x1", "0");
            separatorLine.setAttribute("y1", String(BuzzHistoryChart.rowHeight));
            separatorLine.setAttribute("x2", String(contentWidth));
            separatorLine.setAttribute("y2", String(BuzzHistoryChart.rowHeight));
            separatorLine.setAttribute("stroke", "black");
            separatorLine.setAttribute("stroke-width", "1");
            group.appendChild(separatorLine);

            /*
             The buzz history records should go underneath the team name,
             so we need to add a group to hold the records BEFORE adding
             the team name.
             */
            const recordsGroup = createSvgElement("g");
            this.rowsArray[teamIndex] = select(recordsGroup);
            recordsGroup.setAttribute("id", "records");
            group.append(recordsGroup);

            const textNode = createSvgElement("text");
            textNode.setAttribute("x", "10");
            textNode.setAttribute("y", String(BuzzHistoryChart.rowHeight / 2));
            textNode.setAttribute("dominant-baseline", "middle");
            textNode.innerHTML = `${teams[teamIndex].teamName}`;
            group.appendChild(textNode);

            // keep track of the maximum width of the text element
            const textWidth = textNode.getBBox().width;
            if (textWidth > maxTextWidth) {
                maxTextWidth = textWidth;
            }
        }

        this.maxWidthOfTeamNameLabels = maxTextWidth;

        const xPositionAtTimeZero = this.scaleWithZoomTransform(0);
        const verticalLine = this.verticalLineWhenOperatorPressedSpace = createSvgElement("line");
        verticalLine.setAttribute("id", "operator-finished-reading-question");
        verticalLine.setAttribute("y1", "0");
        verticalLine.setAttribute("y2", String(contentHeight));
        verticalLine.setAttribute("x1", String(xPositionAtTimeZero));
        verticalLine.setAttribute("x2", String(xPositionAtTimeZero));
        verticalLine.setAttribute("stroke", "black");
        verticalLine.setAttribute("stroke-width", "1");
        verticalLine.setAttribute("visibility", "hidden");
        groupContent.appendChild(verticalLine);


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
        this.scaleInitial.domain([firstTimestamp * 1.3, lastTimestamp * 1.1]);

        // Update the scale which the axis generator will use
        this.axisGenerator.scale(this.scaleWithZoomTransform);

        // Re-draw the axis
        const d3SelectionOfGroupXAxis = select(this.groupXAxis);
        this.axisGenerator(d3SelectionOfGroupXAxis);

        this.verticalLineWhenOperatorPressedSpace.setAttribute("visibility", "visible");
        const xPositionAtTimeZero = this.scaleInitial(0);
        this.verticalLineWhenOperatorPressedSpace.setAttribute("x1", String(xPositionAtTimeZero));
        this.verticalLineWhenOperatorPressedSpace.setAttribute("x2", String(xPositionAtTimeZero));

    }

    public redraw(): void {
        if (!this.history) {
            return;
        }

        const xPositionAtTimeZero = this.scaleWithZoomTransform(0);
        const lockoutBarWidth = this.scaleWithZoomTransform(this.lockoutDurationMillisec) - xPositionAtTimeZero;

        this.verticalLineWhenOperatorPressedSpace.setAttribute("x1", String(xPositionAtTimeZero));
        this.verticalLineWhenOperatorPressedSpace.setAttribute("x2", String(xPositionAtTimeZero));


        this.history.records.forEach((recordsForTeam, teamIndex) => {

            const groupForTeam = this.rowsArray[teamIndex];

            /*
            For information about what .data().join() means:
            https://www.d3indepth.com/datajoins/
            https://observablehq.com/@d3/selection-join
            */


            // Draw bars for buzzes that were too early
            groupForTeam
                .selectAll("rect.too-early-start-lockout")
                .data(recordsForTeam.filter(record => record.result?.type === "too-early-start-lockout"))
                .join("rect")
                .classed("too-early-start-lockout", true)
                .attr("x", d => this.scaleWithZoomTransform(d.startTimestamp))
                .attr("y", BuzzHistoryChart.yPositionForBars)
                .attr("width", lockoutBarWidth)
                .attr("height", BuzzHistoryChart.barHeight)
                .attr("fill", "orange")
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            // Draw bars for when a team started answering
            groupForTeam
                .selectAll("rect.start-answer")
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
                .classed("start-answer", true)
                .attr("x", d => this.scaleWithZoomTransform(d.startTimestamp))
                .attr("y", BuzzHistoryChart.yPositionForBars)
                .attr("width", d => this.scaleWithZoomTransform(d.result.endTimestamp) - this.scaleWithZoomTransform(d.startTimestamp))
                .attr("height", BuzzHistoryChart.barHeight)
                .attr("fill", d => (d.result.answeredCorrectly ? "lime" : "red"))
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            // Draw a dot for every time a team pressed a buzzer
            groupForTeam
                .selectAll("circle.buzzer-press")
                .data(recordsForTeam)
                .join("circle")
                .classed("buzzer-press", true)
                .attr("cx", d => this.scaleWithZoomTransform(d.startTimestamp))
                .attr("cy", BuzzHistoryChart.rowHeight / 2)
                .attr("r", BuzzHistoryChart.dotRadius)
                .attr("fill", "black")
                .attr("stroke-width", 0);
        });
    }

}
