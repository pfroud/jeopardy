export interface StateMachineState {
    readonly NAME: string;
    readonly PRESENTATION_SLIDE_TO_SHOW?: string;
    readonly INSTRUCTIONS?: string;
    readonly ON_ENTER?: (keyboardEvent?: KeyboardEvent) => void; //keyboard event is used for Operator.handleBuzzerPress()
    readonly ON_EXIT?: () => void;
    readonly TRANSITIONS: StateMachineTransition[];
    readonly KEYBOARD_LISTENERS?: KeyboardListener[];
}

export type StateMachineTransition = ManualTransition | IfTransition | TimeoutTransition | KeyboardTransition | KeyboardIfTransition;

interface SimpleTransitionBase {
    readonly DESTINATION: string;
    readonly ON_TRANSITION?: () => void;
    readonly GUARD_CONDITION?: () => boolean;
}

export interface ManualTransition extends SimpleTransitionBase {
    readonly TYPE: "manualTrigger";
    readonly TRIGGER_NAME: string;
}

interface IfTransitionBase {
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

export interface IfTransition extends IfTransitionBase {
    readonly TYPE: "if";
}

export interface TimeoutTransition extends SimpleTransitionBase {
    readonly TYPE: "timeout";
    readonly BEHAVIOR: CountdownBehavior;
    readonly INITIAL_DURATION_MILLISEC: number;
    readonly IS_WAITING_FOR_TEAM_TO_ANSWER_AFTER_BUZZ?: boolean;
}

export enum CountdownBehavior {
    // need to specify string values for enum so it appears in the graphviz language file
    ResetTimerEveryTimeYouEnterTheState = "new",
    ContinueTimerUntilManuallyReset = "continue"
}

interface KeyboardBase {
    readonly KEYBOARD_KEYS: string;
    readonly GUARD_CONDITION?: (keyboardEvent: KeyboardEvent) => boolean;
}

/**
 * Changes state from keyboard input.
 * 
 * If you do not want to change states, use KeyboardListener instead.
 */
export interface KeyboardTransition extends KeyboardBase {
    readonly TYPE: "keyboard";
    readonly DESTINATION: string;
    readonly ON_TRANSITION?: (keyboardEvent: KeyboardEvent) => void;
}

/**
 * Call a function from keyboard input, without changing states.
 * 
 * You can instead use a KeyboardTransition to respond to keyboard presses
 * in the state machine, but that requires a destination state. You can
 * set the destination to be the same as the source, but if the state
 * has an ON_ENTER function it will be called every time the keyboard
 * transition happens. If that is a problem, use KeyboardListener instead.
 */
export interface KeyboardListener extends KeyboardBase {
    readonly ON_KEY_DOWN: (keyboardEvent: KeyboardEvent) => void;
}

export interface KeyboardIfTransition extends IfTransitionBase, KeyboardBase {
    readonly TYPE: "keyboardWithIf";
}
