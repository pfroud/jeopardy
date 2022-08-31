export { }; //force this file to be a module so we can compile it using --isolatedModules tsc option

/*
Some categories have special rules or need special explanation.
*/
interface SpecialCategoryInterface {
    description?: string,
    example?: {
        category?: string,
        question: string,
        answer: string
    }        //alreadyShowedTheMessageInThisGame: false
}

interface SpecialCategoriesInterface {
    [categoryNameContains: string]: SpecialCategoryInterface
}

const beforeAndAfter: SpecialCategoryInterface = {
    description: "The first and second parts of the correct answer share a word in common.",
    example: {
        question: "Doctor's office holding area feature that allows you to order food & drink to be delivered to you",
        answer: "Waiting room service [waiting room + room service]"
    }
};

const homophone: SpecialCategoryInterface = {
    description: "Words that are pronounced the same but have different meaning. (May also have different spelling.)",
    example: {
        category: "HOMOPHONES",
        question: "A mineral supply & a paddle.",
        answer: "ore / oar"
    }
};

const potpourri: SpecialCategoryInterface = {
    description: "It can be anything."
};


const specialCategories: SpecialCategoriesInterface = {
    // https://list.fandom.com/wiki/Jeopardy!_recurring_categories
    "\"": {
        description: "The correct answer contains the letter(s) in quotes.",
        example: {
            category: "\"AFTER\" CLASS",
            question: "A small earthquake or tremor that occurs following a major one.",
            answer: "Aftershock"
        }
    },
    "CROSSWORD CLUES": {
        description: "The category gives the first letter of the correct answer. The clue gives the number of letters in the correct answer.",
        example: {
            category: "CROSSWORD CLUES \"H\"",
            question: "God of the underworld (5 letters)",
            answer: "Hades"
        }
    },
    "FILE UNDER": {
        description: "The correct answer starts with the given letter.",
        example: {
            category: "FILE UNDER \"Q\"",
            question: "The 4-sided center area of a college campus.",
            answer: "Quad"
        }
    },
    "WORDS IN": {
        description: "The correct answer can be formed from the word in the category title.",
        example: {
            category: "WORDS IN SEPTEMBER",
            question: "Neil Armstrong famously took a small one.",
            answer: "Step"
        }
    },
    "WORDS FROM": {
        description: "The correct response can be formed from the ",
        example: {
            category: "WORDS FROM PLANETS",
            question: "A song from the eighth planet.",
            answer: "Tune [neptune is the eighth planet]"
        }
    },
    "BEFORE AND AFTER": beforeAndAfter,
    "BEFORE & AFTER": beforeAndAfter,
    "JEOPORTMANTEAU": {
        description: "The correct answer is an artificial portmanteau.",
        example: {
            question: "Cone-shaped dwelling plus hide-your-face game played by youngsters.",
            answer: "Teepeekaboo [teepee + peekaboo]"
        }
    },
    "STUPID ANSWERS": {
        description: "The correct answer appears in the question.",
        example: {
            question: "The Sahara Desert derives its name from an Arabic word meaning this.",
            answer: "Desert"
        }
    },
    "SPELLING": {
        description: "You have to spell out the answer.",
        example: {
            category: "GEOGRAPHIC SPELLING BEE",
            question: " The name of this large sea comes from words for \"middle of the land\".",
            answer: "M-E-D-I-T-E-R-R-A-N-E-A-N"
        }
    },
    "COMMON BONDS": {
        description: "The correct answer is the connection between the given items.",
        example: {
            question: "Bad habits, footballs, buckets.",
            answer: "Things you kick"
        }
    },
    "NAME'S THE SAME": {
        description: "The names share the first of last word.",
        example: {
            category: "FIRST NAME'S THE SAME",
            question: "Gable, Clifford, Kent.",
            answer: "Clark"
        }
    },
    "GET YOUR FACTS STRAIGHT": {
        description: "Clues in this category present information about two similar-sounding names, one of which is stated in the clue and the other of which is the correct response.",
        example: {
            question: "If you're vulpine, you're like a fox; if you're lying on your back with your face upward, you're in this position.",
            answer: "Supine"
        }
    },
    "ALSO A": {
        example: {
            category: "ALSO A SCHOOL WORD",
            question: "It comes between phylum & order.",
            answer: "Class"
        }
    },
    "SOUNDS LIKE": {
        example: {
            category: "SOUNDS LIKE A BOAT PART",
            question: "To remove the shell or husk from beans or seeds.",
            answer: "Hull"
        }
    },
    "HOMOPHONE": homophone,
    "HOMOPHONIC": homophone,
    "RHYME TIME": {
        description: "The correct response is contains two rhyming words.",
        example: {
            question: "Type of paint for your dromedary.",
            answer: "Camel enamel"
        }
    },
    "QUASI-RELATED PAIRS": {
        description: "The clue describes two unrelated people or things whose names are shared by a well known pair.",
        example: {
            question: "One who monitors an exam & to risk money.",
            answer: "proctor & gamble"
        }
    },
    "POTENT POTABLES": {
        description: "The correct answer is an alcoholic drink.",
        example: {
            question: "It's the main alcoholic ingredient in a pina colada.",
            answer: "Rum"
        }
    },
    "POTPOURRI": potpourri,
    "HODGEPODGE": potpourri,
    "GOULASH": potpourri,
    "LEFTOVERS": potpourri
};