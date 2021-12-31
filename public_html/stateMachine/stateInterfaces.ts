export interface StateMachineState {
    name: string;
    presentationSlideToShow?: string;
    onEnter?: (keyboardEvent?: KeyboardEvent) => void;
    onExit?: () => void;
    transitions: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | TimeoutTransition | KeyboardTransition;

// need to specify string values for enum so it appears in graphviz dot file
export enum TransitionType {
    ManualTrigger = "manualTrigger",
    If = "if",
    Promise = "promise",
    Timeout = "timeout",
    Keyboard = "keyboard"
}

export interface ManualTransition {
    type: TransitionType.ManualTrigger;
    triggerName: string;
    destination: string;
    fn?: () => void;
}

export interface IfTransition {
    type: TransitionType.If;
    condition: (arg0: KeyboardEvent) => boolean;
    then: {
        destination: string;
        fn?: () => void;
    };
    else: {
        destination: string;
        fn?: () => void;
    };
}

export interface PromiseTransition {
    type: TransitionType.Promise;
    functionToGetPromise: () => Promise<void>;
    destination: string;
}

export interface TimeoutTransition {
    type: TransitionType.Timeout;
    duration: (() => number) | number;
    destination: string;
    countdownTimerShowDots?: boolean;
    //countdownTimerProgressElementGroup: string;
    fn?: () => void; //called when time runs out
}

export interface KeyboardTransition {
    type: TransitionType.Keyboard;
    keyboardKeys: string;
    destination: string;
    fn?: (keyboardEvent: KeyboardEvent) => void;
}
