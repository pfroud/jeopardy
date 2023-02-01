export interface StateMachineState {
    name: string;
    presentationSlideToShow?: string;
    onEnter?: (keyboardEvent?: KeyboardEvent) => void; //keyboard event is used for Operator.handleBuzzerPress()
    onExit?: () => void;
    transitions: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | TimeoutTransition | KeyboardTransition;

export interface ManualTransition {
    type: "manualTrigger";
    triggerName: string;
    destination: string;
    onTransition?: () => void;
    guardCondition?: () => boolean;
}

export interface IfTransition {
    type: "if";
    condition: () => boolean;
    then: {
        destination: string;
        onTransition?: () => void;
    };
    else: {
        destination: string;
        onTransition?: () => void;
    };
}

export interface PromiseTransition {
    type: "promise";
    functionToGetPromise: () => Promise<void>;
    destination: string;
    guardCondition?: () => boolean;
}

export interface TimeoutTransition {
    type: "timeout";
    destination: string;
    behavior: CountdownBehavior;
    initialDuration: number;
    isWaitingForTeamToAnswerAfterBuzz?: boolean;
    onTransition?: () => void; //called when time runs out
    guardCondition?: () => boolean;
}

export enum CountdownBehavior {
    // need to specify string values for enum so it appears in graphviz dot file
    ResetTimerEveryTimeYouEnterTheState = "new",
    ContinueTimerUntilManuallyReset = "continue"
}

export interface KeyboardTransition {
    type: "keyboard";
    keyboardKeys: string;
    destination: string;
    onTransition?: (keyboardEvent: KeyboardEvent) => void;
    guardCondition?: (keyboardEvent: KeyboardEvent) => boolean;
}
