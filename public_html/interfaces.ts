export interface Slides {
    [name: string]: JQuery<HTMLDivElement>;
}

export interface Clue {
    answer: string;
    question: string;
    value: number;
    airdate: string;
    category: { title: string }
}