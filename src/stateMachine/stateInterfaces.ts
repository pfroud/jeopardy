import { CountdownTimer } from "../CountdownTimer";

export interface StateMachineState {
    name: string;
    presentationSlideToShow?: string;
    onEnter?: (keyboardEvent?: KeyboardEvent) => void;// TODO why does this get a keyboard event??
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
    onTransition?: () => void;
    guardCondition?: () => boolean;
}


export interface IfTransition {
    type: TransitionType.If;
    condition: (arg0: KeyboardEvent) => boolean;// TODO why does this get a keyboard event??
    then: {
        destination: string;
        onTransitionThen?: () => void;
    };
    else: {
        destination: string;
        onTransitionElse?: () => void;
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
    countdownTimerShowDots?: boolean;
    countdownTimerSource: CountdownTimerSource | (() => CountdownTimerSource);
    onTransition?: () => void; //called when time runs out
    guardCondition?: () => boolean;
}

// https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
export enum CountdownOperation {
    CreateNew,
    ResumeExisting
}
export interface CreateNewCountdownTimer {
    type: CountdownOperation.CreateNew;
    duration: number;
}
export interface ResumeExistingCountdownTimer {
    type: CountdownOperation.ResumeExisting;
    countdownTimerToResume: CountdownTimer;
}
export type CountdownTimerSource = CreateNewCountdownTimer | ResumeExistingCountdownTimer;


export interface KeyboardTransition {
    type: TransitionType.Keyboard;
    keyboardKeys: string;
    destination: string;
    onTransition?: (keyboardEvent: KeyboardEvent) => void;
    guardCondition?: (keyboardEvent: KeyboardEvent) => boolean;
}
