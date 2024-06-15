/*
Some categories have special rules or need special explanation.
This list is from:
https://list.fandom.com/wiki/Jeopardy!_recurring_categories
*/
export interface SpecialCategory {
    /** Name to show to human operator and players */
    readonly DISPLAY_NAME: string;
    readonly CATEGORY_NAME_MATCHES: RegExp;
    readonly DESCRIPTION: string;
    readonly EXAMPLE?: {
        readonly CATEGORY: string;
        readonly QUESTION: string;
        readonly ANSWER: string;
    }
}

export function checkSpecialCategory(categoryName: string): SpecialCategory | null {
    // search for the first one which matches
    for (const specialCategory of specialCategories) {
        if (specialCategory.CATEGORY_NAME_MATCHES.test(categoryName)) {
            return specialCategory;
        }
    }
    return null;
}

export const specialCategories: SpecialCategory[] = [
    {
        DISPLAY_NAME: "Crossword clue categories",
        CATEGORY_NAME_MATCHES: /CROSSWORD CLUE/i,
        DESCRIPTION: "The category gives the first letter of the correct answer. The clue gives the number of letters in the correct answer.",
        EXAMPLE: {
            CATEGORY: "CROSSWORD CLUES \"H\"",
            QUESTION: "God of the underworld (5 letters)",
            ANSWER: "Hades"
        }
    }, {
        DISPLAY_NAME: "\"File under\" categories",
        CATEGORY_NAME_MATCHES: /FILE UNDER/i,
        DESCRIPTION: "The correct answer starts with the given letter.",
        EXAMPLE: {
            CATEGORY: "FILE UNDER \"Q\"",
            QUESTION: "The 4-sided center area of a college campus.",
            ANSWER: "Quad"
        }
    }, {
        DISPLAY_NAME: "\"Words in\" categories",
        CATEGORY_NAME_MATCHES: /WORDS (THAT ARE)? IN/i,
        DESCRIPTION: "The correct answer can be formed from the word in the category title. Not in order, do not need to use all of them.",
        EXAMPLE: {
            CATEGORY: "WORDS IN SEPTEMBER",
            QUESTION: "Neil Armstrong famously took a small one.",
            ANSWER: "Step"
        }
    }, {
        DISPLAY_NAME: "Before-and-after categories",
        CATEGORY_NAME_MATCHES: /BEFORE (AND)|& AFTER/i,
        DESCRIPTION: "The first and second parts of the correct answer share a word in common.",
        EXAMPLE: {
            CATEGORY: "BEFORE AND AFTER",
            QUESTION: "Doctor's office holding area feature that allows you to order food & drink to be delivered to you.",
            ANSWER: "Waiting room service [waiting room + room service]"
        }
    }, {
        DISPLAY_NAME: "J-portmanteau categories",
        CATEGORY_NAME_MATCHES: /JEOPORTMANTEAU/i,
        DESCRIPTION: "The correct answer is an artificial portmanteau.",
        EXAMPLE: {
            CATEGORY: "JEOPORTMANTEAU",
            QUESTION: "Cone-shaped dwelling plus hide-your-face game played by youngsters.",
            ANSWER: "Teepeekaboo [teepee + peekaboo]"
        }
    }, {
        DISPLAY_NAME: "\"Stupid answer\" categories",
        CATEGORY_NAME_MATCHES: /STUPID ANSWER/i,
        DESCRIPTION: "The correct answer appears in the question.",
        EXAMPLE: {
            CATEGORY: "STUPID ANSWERS",
            QUESTION: "The Sahara Desert derives its name from an Arabic word meaning this.",
            ANSWER: "Desert"
        }
    }, {
        DISPLAY_NAME: "Spelling categories",
        CATEGORY_NAME_MATCHES: /SPELLING/i,
        DESCRIPTION: "You have to spell out the answer.",
        EXAMPLE: {
            CATEGORY: "GEOGRAPHIC SPELLING BEE",
            QUESTION: "The name of this large sea comes from words for \"middle of the land\".",
            ANSWER: "M-E-D-I-T-E-R-R-A-N-E-A-N"
        }
    }, {
        DISPLAY_NAME: "\"Common bonds\" categories",
        CATEGORY_NAME_MATCHES: /COMMON BOND/i,
        DESCRIPTION: "The correct answer is the connection between the given items.",
        EXAMPLE: {
            CATEGORY: "COMMON BONDS",
            QUESTION: "Bad habits, footballs, buckets.",
            ANSWER: "Things you kick"
        }
    }, {
        DISPLAY_NAME: "\"Name's the same\" categories",
        CATEGORY_NAME_MATCHES: /NAME.S THE SAME/i, //allow curly apostrophe
        DESCRIPTION: "The names share the first or last word.",
        EXAMPLE: {
            CATEGORY: "FIRST NAME'S THE SAME",
            QUESTION: "Gable, Clifford, Kent.",
            ANSWER: "Clark"
        }
    }, {
        DISPLAY_NAME: "\"Get your facts straight\" categories",
        CATEGORY_NAME_MATCHES: /GET YOUR FACTS STRAIGHT/i,
        DESCRIPTION: "Clues in this category present information about two similar-sounding names, one of which is stated in the clue and the other of which is the correct response.",
        EXAMPLE: {
            CATEGORY: "GET YOUR FACTS STRAIGHT",
            QUESTION: "If you're vulpine, you're like a fox; if you're lying on your back with your face upward, you're in this position.",
            ANSWER: "Supine"
        }
    }, {
        DISPLAY_NAME: "\"Also a ...\" categories",
        CATEGORY_NAME_MATCHES: /ALSO A/i,
        DESCRIPTION: "The correct response is also an unrelated thing.",
        EXAMPLE: {
            CATEGORY: "ALSO A SCHOOL WORD",
            QUESTION: "It comes between phylum & order.",
            ANSWER: "Class"
        }
    }, {
        DISPLAY_NAME: "\"Sounds like...\" categories",
        CATEGORY_NAME_MATCHES: /SOUNDS LIKE/i,
        DESCRIPTION: "The correct response sounds like an unrelated thing or person.",
        EXAMPLE: {
            CATEGORY: "SOUNDS LIKE A BOAT PART",
            QUESTION: "To remove the shell or husk from beans or seeds.",
            ANSWER: "Hull"
        }
    }, {
        DISPLAY_NAME: "Rhyme time",
        CATEGORY_NAME_MATCHES: /RHYME TIME/i,
        DESCRIPTION: "The correct response contains two rhyming words.",
        EXAMPLE: {
            CATEGORY: "RHYME TIME",
            QUESTION: "Type of paint for your dromedary.",
            ANSWER: "Camel enamel"
        }
    }, {
        DISPLAY_NAME: "Quasi-related pairs",
        CATEGORY_NAME_MATCHES: /QUASI.RELATED PAIRS/i, //allow hyphen or any type of dash
        DESCRIPTION: "The clue describes two unrelated people or things whose names are shared by a well-known pair.",
        EXAMPLE: {
            CATEGORY: "QUASI-RELATED PAIRS",
            QUESTION: "One who monitors an exam & to risk money.",
            ANSWER: "proctor & gamble"
        }
    }, {
        DISPLAY_NAME: "Non-potent potables",
        CATEGORY_NAME_MATCHES: /NON-?POTENT POTABLES/i,
        DESCRIPTION: "The correct answer is a non-alcoholic beverage.",
        EXAMPLE: {
            CATEGORY: "NONPOTENT POTABLES",
            QUESTION: "This sparkling liquid named for a German town was a forerunner of soda pop.",
            ANSWER: "Seltzer"
        }
    }, {
        DISPLAY_NAME: "Potent potables",
        CATEGORY_NAME_MATCHES: /POTENT POTABLE/i,
        DESCRIPTION: "The correct answer is an alcoholic drink.",
        EXAMPLE: {
            CATEGORY: "POTENT POTABLES",
            QUESTION: "It's the main alcoholic ingredient in a pina colada.",
            ANSWER: "Rum"
        }
    }, {
        DISPLAY_NAME: "Homophone categories",
        CATEGORY_NAME_MATCHES: /HOMOPHON/i, //match "homophone" or "homophonic"
        DESCRIPTION: "Words that are pronounced the same but have different meaning. (May also have different spelling.)",
        EXAMPLE: {
            CATEGORY: "HOMOPHONES",
            QUESTION: "A mineral supply & a paddle.",
            ANSWER: "ore / oar"
        }
    }, {
        DISPLAY_NAME: "Potpourri, hodgepodge, goulash, leftovers, mixed bag",
        CATEGORY_NAME_MATCHES: /(POTPOURRI)|(HODGEPODGE)|(GOULASH)|(LEFTOVERS)|(MIXED BAG)/i,
        DESCRIPTION: "It can be anything."
    }, {
        DISPLAY_NAME: "Quotation-mark categories",
        CATEGORY_NAME_MATCHES: /"|“|”/,  // match quotation mark and curly quotes
        DESCRIPTION: "The correct answer contains the letter(s) in quotes.",
        EXAMPLE: {
            CATEGORY: "\"AFTER\" CLASS",
            QUESTION: "A small earthquake or tremor that occurs following a major one.",
            ANSWER: "Aftershock"
        }
    }
];