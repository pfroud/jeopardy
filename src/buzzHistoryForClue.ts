import { Clue } from "./operator/Operator";

export interface BuzzHistoryForClue {

    clue: Clue;
    /*
    Should I make a separate data structure to keep track of records
    for each team, or should the team number be a field in the record?
    */
    records: BuzzHistoryRecord[];
    timestampWhenClueQuestionFinishedReading: number;
}

export interface BuzzHistoryRecord {
    timestamp: number;
    teamNumber: number;
    // result: BuzzResult;
    note?: string;
}

export enum BuzzResult {
    TOO_EARLY = "too early",
    TOO_LATE_DO_NOTHING = "too late",
    START_ANSWERING = "start answering"
}

export const exampleBuzzHistory: BuzzHistoryForClue = {
    clue: null,
    records: [
        { timestamp: 1664501695729, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501695930, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696039, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696151, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696267, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696375, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696502, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696636, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696778, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696908, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501697078, teamNumber: 2, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501697079, teamNumber: 2, note: 'Operator.handleBuzzerPress()' },
        { timestamp: 1664501700134, teamNumber: 3, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' }
    ],
    timestampWhenClueQuestionFinishedReading: 1664501696893
};

export function createDiagram(target: HTMLDivElement, history: BuzzHistoryForClue): void {
    console.log("create diagram");
}