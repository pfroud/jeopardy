export interface StateMachineState {
    readonly name: string;
    readonly presentationSlideToShow?: string;
    readonly onEnter?: (keyboardEvent?: KeyboardEvent) => void; //keyboard event is used for Operator.handleBuzzerPress()
    readonly onExit?: () => void;
    readonly transitions: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | TimeoutTransition | KeyboardTransition;

export interface ManualTransition {
    readonly type: "manualTrigger";
    readonly triggerName: string;
    readonly destination: string;
    readonly onTransition?: () => void;
    readonly guardCondition?: () => boolean;
}

export interface IfTransition {
    readonly type: "if";
    readonly condition: () => boolean;
    readonly then: {
        readonly destination: string;
        readonly onTransition?: () => void;
    };
    readonly else: {
        readonly destination: string;
        readonly onTransition?: () => void;
    };
}

export interface PromiseTransition {
    readonly type: "promise";
    readonly functionToGetPromise: () => Promise<void>;
    readonly destination: string;
    readonly guardCondition?: () => boolean;
}

export interface TimeoutTransition {
    readonly type: "timeout";
    readonly destination: string;
    readonly behavior: CountdownBehavior;
    readonly initialDuration: number;
    readonly isWaitingForTeamToAnswerAfterBuzz?: boolean;
    readonly onTransition?: () => void; //called when time runs out
    readonly guardCondition?: () => boolean;
}

export enum CountdownBehavior {
    // need to specify string values for enum so it appears in graphviz dot file
    ResetTimerEveryTimeYouEnterTheState = "new",
    ContinueTimerUntilManuallyReset = "continue"
}

export interface KeyboardTransition {
    readonly type: "keyboard";
    readonly keyboardKeys: string;
    readonly destination: string;
    readonly onTransition?: (keyboardEvent: KeyboardEvent) => void;
    readonly guardCondition?: (keyboardEvent: KeyboardEvent) => boolean;
}
