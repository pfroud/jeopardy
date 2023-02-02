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



export class BuzzHistoryChart {

    private static readonly rowHeight = 50;
    private static readonly dotRadius = 5;
    private static readonly barHeight = BuzzHistoryChart.dotRadius * 2;
    private static readonly yForBars = (BuzzHistoryChart.rowHeight / 2) - (BuzzHistoryChart.barHeight / 2);

    private readonly verticalLine: Selection<SVGLineElement, unknown, null, undefined>;
    private zoomedScale: ScaleLinear<number, number>;
    private readonly rowsArray: Selection<SVGGElement, unknown, null, undefined>[] = [];

    private readonly groupXAxis: Selection<SVGGElement, unknown, null, undefined>;

    private readonly scaleWithoutZoom: ScaleLinear<number, number>;
    private readonly axisGenerator: Axis<number>;

    private readonly labelsWidth: number;

    private history: BuzzHistoryForClue | null = null;

    private readonly lockoutDurationMillisec: number;

    public constructor(teams: Team[], _svg_: SVGSVGElement, lockoutDurationMillisec: number) {
        this.lockoutDurationMillisec = lockoutDurationMillisec;
        const margin = {
            top: 20,
            left: 20,
            right: 20,
            bottom: 20
        };

        const svgWidth = 800;
        const svgHeight = (teams.length * BuzzHistoryChart.rowHeight) + margin.top + margin.bottom + 50;

        const contentWidth = svgWidth - margin.left - margin.right;
        const contentHeight = svgHeight - margin.top - margin.bottom;

        const svg = select(_svg_)
            .attr("width", svgWidth)
            .attr("height", svgHeight);

        // the content group is everything except the axis
        const groupContent = svg.append("g")
            .attr("id", "content")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        this.groupXAxis = svg.append("g")
            .attr("id", "axis")
            .attr("transform", `translate(${margin.left}, ${contentHeight})`);


        // This scale maps time (in milliseconds) to screen-space pixels
        this.scaleWithoutZoom = scaleLinear()
            .range([0, contentWidth]);

        this.zoomedScale = this.scaleWithoutZoom; //will be changed by the zoom controller

        this.axisGenerator = axisBottom<number>(this.zoomedScale)
            .tickSizeOuter(0)
            .tickFormat(n => `${n} ms`);

        this.groupXAxis.call(this.axisGenerator);

        ///////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////// Pan & zoom //////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////

        /*
        https://www.d3indepth.com/zoom-and-pan/
        https://observablehq.com/@d3/pan-zoom-axes
        https://gist.github.com/jgbos/9752277
        */

        const handleZoom = (zoomEvent: D3ZoomEvent<SVGSVGElement, unknown>): void => {

            this.zoomedScale = zoomEvent.transform.rescaleX(this.scaleWithoutZoom);

            // Change the scale which will be used by the axis generator
            this.axisGenerator.scale(this.zoomedScale);

            // Re-draw the axis
            this.groupXAxis.call(this.axisGenerator);

            // Re-draw the buzz history diagram
            this.redraw();
        };

        const zoomController = zoom<SVGSVGElement, unknown>()
            .on("zoom", handleZoom);

        svg.call(zoomController);


        const rowsGroup = groupContent.append("g")
            .attr("id", "rows");

        let maxTextWidth = -Infinity;

        // Draw team name, horizontal line, and alternating shaded background
        for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {

            const group = rowsGroup.append("g")
                .attr("id", `team-index-${teamIndex}`)
                .attr("transform", `translate(0, ${BuzzHistoryChart.rowHeight * teamIndex})`);

            // Shaded background for alternate teams
            if (teamIndex % 2 === 0) {
                group.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", contentWidth)
                    .attr("height", BuzzHistoryChart.rowHeight)
                    .attr("fill", "#eee");
            }

            // Horizontal lines to separate teams
            group.append("line")
                .attr("x1", 0)
                .attr("y1", BuzzHistoryChart.rowHeight)
                .attr("x2", contentWidth)
                .attr("y2", BuzzHistoryChart.rowHeight)
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            // the records should go underneath the team name
            this.rowsArray[teamIndex] = group.append("g")
                .attr("id", "records");

            // Team name
            const textNode = group.append("text")
                .attr("x", "10")
                .attr("y", BuzzHistoryChart.rowHeight / 2)
                .attr("dominant-baseline", "middle")
                .text(`${teams[teamIndex].teamName}`);

            const actualNode = textNode.node();
            if (actualNode) {
                const textWidth = actualNode.getBBox().width;
                if (textWidth > maxTextWidth) {
                    maxTextWidth = textWidth;
                }
            }
        }

        this.labelsWidth = maxTextWidth;

        // Draw a vertical line to show when the operator pressed space
        this.verticalLine = groupContent.append("line")
            .attr("id", "operator-finished-reading-question")
            .attr("y1", 0)
            .attr("y2", contentHeight)
            .attr("x1", this.zoomedScale(0))
            .attr("x2", this.zoomedScale(0))
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("visibility", "hidden");


    }

    public setHistory(history: BuzzHistoryForClue): void {

        if (history.records.length === 0) {
            console.warn("array of buzz history records is empty");
            return;
        }

        this.history = history;

        // include time zero 
        const allTimestamps: number[] = [0];

        // Change all the timestamps so time zero is when the operator finished reading the question
        this.history.records.forEach(arrayOfRecordsForTeam => arrayOfRecordsForTeam.forEach(record => {
            record.startTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
            allTimestamps.push(record.startTimestamp);
            if (record.result?.type === "start-answer") {
                record.result.endTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
                allTimestamps.push(record.result.endTimestamp);
            }
        }));


        const firstDomain = [
            Math.min(...allTimestamps),
            Math.max(...allTimestamps) * 1.2
        ];
        this.scaleWithoutZoom.domain(firstDomain);

        const extraSpaceForText = this.scaleWithoutZoom.invert(this.labelsWidth + 20);
        this.scaleWithoutZoom.domain([
            firstDomain[0] + extraSpaceForText,
            firstDomain[1]
        ]);

        this.axisGenerator.scale(this.zoomedScale);

        // Re-draw the axis
        this.groupXAxis.call(this.axisGenerator);

        this.verticalLine.attr("visibility", "visible");
        const scaleTimeZero = this.scaleWithoutZoom(0);
        this.verticalLine
            .attr("x1", scaleTimeZero)
            .attr("x2", scaleTimeZero);

    }

    public redraw(): void {
        if (!this.history) {
            return;
        }

        const zoomedScaleTimeZero = this.zoomedScale(0);
        const zoomedScaleLockoutDuration = this.zoomedScale(this.lockoutDurationMillisec);
        const lockoutBarWidth = zoomedScaleLockoutDuration - zoomedScaleTimeZero;

        this.verticalLine
            .attr("x1", zoomedScaleTimeZero)
            .attr("x2", zoomedScaleTimeZero);

        this.history.records.forEach((recordsForTeam, teamIndex) => {

            const groupForTeam = this.rowsArray[teamIndex];

            /*
            https://www.d3indepth.com/datajoins/
            https://observablehq.com/@d3/selection-join
            */


            // Draw bars for buzzes that were too early
            groupForTeam
                .selectAll("rect.too-early-start-lockout")
                .data(recordsForTeam.filter(r => r.result?.type === "too-early-start-lockout"))
                .join("rect")
                .classed("too-early-start-lockout", true)
                .attr("x", d => this.zoomedScale(d.startTimestamp))
                .attr("y", BuzzHistoryChart.yForBars)
                .attr("width", lockoutBarWidth)
                .attr("height", BuzzHistoryChart.barHeight)
                .attr("fill", "orange")
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            const a = recordsForTeam.filter(r => r.result?.type === "start-answer") as BuzzHistoryRecord<BuzzResultStartAnswer>[];

            groupForTeam
                .selectAll("rect.start-answer")
                .data(a)
                .join("rect")
                .classed("start-answer", true)
                .attr("x", d => this.zoomedScale(d.startTimestamp))
                .attr("y", BuzzHistoryChart.yForBars)
                .attr("width", d => this.zoomedScale(d.result.endTimestamp) - this.zoomedScale(d.startTimestamp))
                .attr("height", BuzzHistoryChart.barHeight)
                .attr("fill", d => (d.result.answeredCorrectly ? "red" : "orange"))
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            groupForTeam
                .selectAll("circle.buzzer-press")
                .data(recordsForTeam)
                .join("circle")
                .classed("buzzer-press", true)
                .attr("cx", d => this.zoomedScale(d.startTimestamp))
                .attr("cy", BuzzHistoryChart.rowHeight / 2)
                .attr("r", BuzzHistoryChart.dotRadius)
                .attr("fill", "black")
                .attr("stroke-width", 0);
        });
    }

}
