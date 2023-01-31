import { select, Selection } from "d3-selection";
import { ScaleLinear, scaleLinear } from "d3-scale";
import { axisBottom } from "d3-axis";
import { zoom, D3ZoomEvent } from "d3-zoom";

export interface BuzzHistoryForClue {
    records: BuzzHistoryRecord[][]; //the first array index is the team index
    timestampWhenClueQuestionFinishedReading: number;
    lockoutDurationMillisec: number
}

export interface BuzzHistoryRecord {
    timestamp: number;
    result: BuzzResult;
    source?: string;
}

export type BuzzResult = BuzzResultTooEarly | BuzzResultTooLate | BuzzResultStartAnswer | BuzzResultIgnored;

interface BuzzResultTooEarly {
    type: "too-early";
}

interface BuzzResultTooLate {
    type: "too-late";
}

interface BuzzResultStartAnswer {
    type: "start-answering";
    answeredCorrectly: boolean;
    endTimestamp: number;
}

interface BuzzResultIgnored {
    type: "ignore";
    reason: string;
}

export class BuzzHistoryDiagram {

    private static readonly rowHeight = 50;
    private static readonly dotRadius = 5;
    private static readonly barHeight = BuzzHistoryDiagram.dotRadius * 2;
    private static readonly yForBars = (BuzzHistoryDiagram.rowHeight / 2) - (BuzzHistoryDiagram.barHeight / 2);

    private readonly verticalLine: Selection<SVGLineElement, unknown, null, undefined>;
    private zoomedScale: ScaleLinear<number, number>;
    private readonly rowsArray: Selection<SVGGElement, unknown, null, undefined>[] = [];

    private history: BuzzHistoryForClue | null = null;

    public constructor(teamCount: number, _svg_: SVGSVGElement) {
        const svgWidth = 800;
        const svgHeight = 600;
        const margin = {
            top: 20,
            left: 20,
            right: 20,
            bottom: 20
        };

        const contentWidth = svgWidth - margin.left - margin.right;
        const contentHeight = svgHeight - margin.top - margin.bottom;

        const svg = select(_svg_)
            .attr("width", svgWidth)
            .attr("height", svgHeight);

        // the content group is everything except the axis
        const groupContent = svg.append("g")
            .attr("id", "content")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const groupXAxis = svg.append("g")
            .attr("id", "axis")
            .attr("transform", `translate(${margin.left}, ${contentHeight})`);

        // This scale maps time (in milliseconds) to screen-space pixels
        const initialScale = scaleLinear()
            .domain([-2_000, 3_000]) //time in milliseconds to initially show on the X axis
            .range([0, contentWidth]);

        this.zoomedScale = initialScale; //will be changed by the zoom controller

        const axisGenerator = axisBottom<number>(this.zoomedScale)
            .tickSizeOuter(0)
            .tickFormat(n => `${n} ms`);

        groupXAxis.call(axisGenerator);

        ///////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////// Pan & zoom //////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////

        /*
        https://www.d3indepth.com/zoom-and-pan/
        https://observablehq.com/@d3/pan-zoom-axes
        https://gist.github.com/jgbos/9752277
        */

        const handleZoom = (zoomEvent: D3ZoomEvent<SVGSVGElement, unknown>): void => {

            this.zoomedScale = zoomEvent.transform.rescaleX(initialScale);

            // Change the scale which will be used by the axis generator
            axisGenerator.scale(this.zoomedScale);

            // Re-draw the axis
            groupXAxis.call(axisGenerator);

            // Re-draw the buzz history diagram
            this.redraw();
        };

        const zoomController = zoom<SVGSVGElement, unknown>()
            .on("zoom", handleZoom);

        svg.call(zoomController);


        const rowsGroup = groupContent.append("g")
            .attr("id", "rows");


        // Draw team name, horizontal line, and alternating shaded background
        for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {

            const group = this.rowsArray[teamIndex] = rowsGroup.append("g")
                .attr("id", `team-index-${teamIndex}`)
                .attr("transform", `translate(0, ${BuzzHistoryDiagram.rowHeight * teamIndex})`);

            // Shaded background for alternate teams
            if (teamIndex % 2 === 0) {
                group.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", contentWidth)
                    .attr("height", BuzzHistoryDiagram.rowHeight)
                    .attr("fill", "#eee");
            }

            // Horizontal lines to separate teams
            group.append("line")
                .attr("x1", 0)
                .attr("y1", BuzzHistoryDiagram.rowHeight)
                .attr("x2", contentWidth)
                .attr("y2", BuzzHistoryDiagram.rowHeight)
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            // Team name
            group.append("text")
                .attr("x", "10")
                .attr("y", BuzzHistoryDiagram.rowHeight / 2)
                .attr("dominant-baseline", "middle")
                .text(`Team ${teamIndex + 1}`);
        }

        // Draw a vertical line to show when the operator pressed space
        this.verticalLine = groupContent.append("line")
            .attr("id", "operator-finished-reading-question")
            .attr("y1", 0)
            .attr("y2", contentHeight)
            // x1 and x2 are set in the update() function
            .attr("stroke", "black")
            .attr("stroke-width", 1);


    }

    public setHistory(history: BuzzHistoryForClue): void {
        this.history = history;

        // Change all the timestamps so time zero is when the operator finished reading the question
        this.history.records.forEach(arrayOfRecordsForTeam => arrayOfRecordsForTeam.forEach(record => {
            record.timestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
            if (record.result.type === "start-answering") {
                record.result.endTimestamp -= this.history!.timestampWhenClueQuestionFinishedReading;
            }
        }));
    }

    public redraw(): void {
        if (!this.history) {
            return;
        }

        // Move the vertical line
        this.verticalLine
            .attr("x1", this.zoomedScale(0))
            .attr("x2", this.zoomedScale(0));

        this.history.records.forEach((recordsForTeam, teamIndex) => {

            const groupForTeam = this.rowsArray[teamIndex];

            /*
            https://www.d3indepth.com/datajoins/
            https://observablehq.com/@d3/selection-join
            */

            // Draw bars for buzzes that were too early
            groupForTeam
                .selectAll("rect.too-early")
                .data(recordsForTeam.filter(r => r.result.type === "too-early"))
                .join("rect")
                .classed("too-early", true)
                .attr("x", d => this.zoomedScale(d.timestamp))
                .attr("y", BuzzHistoryDiagram.yForBars)
                .attr("width", this.zoomedScale(this.history!.lockoutDurationMillisec) - this.zoomedScale(0))
                .attr("height", BuzzHistoryDiagram.barHeight)
                .attr("fill", "red")
                .attr("stroke", "black")
                .attr("stroke-width", 1);


            groupForTeam
                .selectAll("rect.start-answering")
                .data(recordsForTeam.filter(r => r.result.type === "start-answering"))
                .join("rect")
                .classed("start-answering", true)
                .attr("x", d => this.zoomedScale(d.timestamp))
                .attr("y", BuzzHistoryDiagram.yForBars)
                .attr("width", d => {
                    const result = d.result as BuzzResultStartAnswer;
                    return this.zoomedScale(result.endTimestamp) - this.zoomedScale(d.timestamp);
                })
                .attr("height", BuzzHistoryDiagram.barHeight)
                .attr("fill", "lightblue")
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            groupForTeam
                .selectAll("circle.buzzer-press")
                .data(recordsForTeam)
                .join("circle")
                .classed("buzzer-press", true)
                .attr("cx", d => this.zoomedScale(d.timestamp))
                .attr("cy", BuzzHistoryDiagram.rowHeight / 2)
                .attr("r", BuzzHistoryDiagram.dotRadius)
                .attr("fill", "black")
                .attr("stroke-width", 0);
        });
    }

}
