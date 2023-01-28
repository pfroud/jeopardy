import { BuzzHistoryForClue } from "./buzzHistoryForClue";

export const exampleBuzzHistory: BuzzHistoryForClue = {
    "clue": null,
    "lockoutDurationMillisec": 250,
    "records": [
        {
            "timestamp": 1664589171281,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "too-early"
            }
        },
        {
            "timestamp": 1664589171379,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "ignore",
                "reason": "lockout"
            }
        },
        {
            "timestamp": 1664589171477,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "ignore",
                "reason": "lockout"
            }
        },
        {
            "timestamp": 1664589171561,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "too-early"
            }
        },
        {
            "timestamp": 1664589171670,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "ignore",
                "reason": "lockout"
            }
        },
        {
            "timestamp": 1664589171747,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "ignore",
                "reason": "lockout"
            }
        },
        {
            "timestamp": 1664589171843,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "too-early"
            }
        },
        {
            "timestamp": 1664589171944,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "ignore",
                "reason": "lockout"
            }
        },
        {
            "timestamp": 1664589172043,
            "teamNumber": 1,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "ignore",
                "reason": "lockout"
            }
        },
        {
            "timestamp": 1664589173247,
            "teamNumber": 2,
            "source": "Operator.initBuzzerFootswitchIconDisplay() keydown",
            "result": {
                "type": "start-answering",
                "answeredCorrectly": true,
                "endTimestamp": 1664589173247
            }
        },
        {
            "timestamp": 1664589173800,
            "teamNumber": 3,
            "source": "manually typed my peter",
            "result": {
                "type": "too-late"
            }
        }
    ],
    "timestampWhenClueQuestionFinishedReading": 1664589172934
}