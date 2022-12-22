
export interface StateMachineState {
    name: string;
    presentationSlideToShow?: string;
    onEnter?: (keyboardEvent?: KeyboardEvent) => void;// TODO why does this get a keyboard event??
    onExit?: () => void;
    transitions: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | TimeoutTransition | KeyboardTransition;

export enum TransitionType {
    // need to specify string values for enum so it appears in graphviz dot file
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
    onTransition?: () => void;
    guardCondition?: () => boolean;
}


export interface IfTransition {
    type: TransitionType.If;
    condition: (arg0: KeyboardEvent) => boolean;// TODO why does this get a keyboard event??
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
    type: TransitionType.Promise;
    functionToGetPromise: () => Promise<void>;
    destination: string;
    guardCondition?: () => boolean;
}

export interface TimeoutTransition {
    type: TransitionType.Timeout;
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
    type: TransitionType.Keyboard;
    keyboardKeys: string;
    destination: string;
    onTransition?: (keyboardEvent: KeyboardEvent) => void;
    guardCondition?: (keyboardEvent: KeyboardEvent) => boolean;
}
