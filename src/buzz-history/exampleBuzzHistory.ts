import { BuzzHistoryForClue } from "./buzzHistoryForClue";

export const exampleBuzzHistory: BuzzHistoryForClue = {
    "lockoutDurationMillisec": 250,
    "records": [
        [
            //index 0, team number 1
            {
                "timestamp": 1664589171281,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "too-early"
                }
            },
            {
                "timestamp": 1664589171379,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "ignore",
                    "reason": "lockout"
                }
            },
            {
                "timestamp": 1664589171477,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "ignore",
                    "reason": "lockout"
                }
            },
            {
                "timestamp": 1664589171561,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "too-early"
                }
            },
            {
                "timestamp": 1664589171670,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "ignore",
                    "reason": "lockout"
                }
            },
            {
                "timestamp": 1664589171747,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "ignore",
                    "reason": "lockout"
                }
            },
            {
                "timestamp": 1664589171843,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "too-early"
                }
            },
            {
                "timestamp": 1664589171944,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "ignore",
                    "reason": "lockout"
                }
            },
            {
                "timestamp": 1664589172043,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "ignore",
                    "reason": "lockout"
                }
            }
        ], [
            // index 1, team number 2
            {
                "timestamp": 1664589173247,
                "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
                "result": {
                    "type": "start-answering",
                    "answeredCorrectly": true,
                    "endTimestamp": 1664589175247
                }
            }
        ], [
            // index 2, team number 3
            {
                "timestamp": 1664589173800,
                "source": "manually typed my peter",
                "result": {
                    "type": "too-late"
                }
            }
        ]
    ],
    "timestampWhenClueQuestionFinishedReading": 1664589172934
};