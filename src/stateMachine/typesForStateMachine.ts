export interface StateMachineState {
    readonly NAME: string;
    readonly PRESENTATION_SLIDE_TO_SHOW?: string;
    readonly INSTRUCTIONS?: string;
    readonly ON_ENTER?: (keyboardEvent?: KeyboardEvent) => void; //keyboard event is used for Operator.handleBuzzerPress()
    readonly ON_EXIT?: () => void;
    readonly TRANSITIONS: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | TimeoutTransition | KeyboardTransition;

export interface ManualTransition {
    readonly TYPE: "manualTrigger";
    readonly TRIGGER_NAME: string;
    readonly DESTINATION: string;
    readonly ON_TRANSITION?: () => void;
    readonly GUARD_CONDITION?: () => boolean;
}

export interface IfTransition {
    readonly TYPE: "if";
    readonly CONDITION: () => boolean;
    readonly THEN: {
        readonly DESTINATION: string;
        readonly ON_TRANSITION?: () => void;
    };
    readonly ELSE: {
        readonly DESTINATION: string;
        readonly ON_TRANSITION?: () => void;
    };
}

export interface TimeoutTransition {
    readonly TYPE: "timeout";
    readonly DESTINATION: string;
    readonly BEHAVIOR: CountdownBehavior;
    readonly INITIAL_DURATION: number;
    readonly IS_WAITING_FOR_TEAM_TO_ANSWER_AFTER_BUZZ?: boolean;
    readonly ON_TRANSITION?: () => void; //called when time runs out
    readonly GUARD_CONDITION?: () => boolean;
}

export enum CountdownBehavior {
    // need to specify string values for enum so it appears in graphviz dot file
    ResetTimerEveryTimeYouEnterTheState = "new",
    ContinueTimerUntilManuallyReset = "continue"
}


export interface KeyboardTransition {
    readonly TYPE: "keyboard";
    readonly KEYBOARD_KEYS: string;
    readonly DESTINATION: string;
    readonly ON_TRANSITION?: (keyboardEvent: KeyboardEvent) => void;
    readonly GUARD_CONDITION?: (keyboardEvent: KeyboardEvent) => boolean;
}
