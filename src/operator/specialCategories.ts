// https://list.fandom.com/wiki/Jeopardy!_recurring_categories

/*
Some categories have special rules or need special explanation.
*/
interface SpecialCategory {
    categoryNameMatches: RegExp;
    description: string;
    example?: {
        category?: string;
        question: string;
        answer: string;
    },
    alreadyShowedTheMessageInThisGame?: boolean;
}

export const specialCategories = new Set<SpecialCategory>([
    {
        categoryNameMatches: /\"|“|”/,
        description: "The correct answer contains the letter(s) in quotes.",
        example: {
            category: "\"AFTER\" CLASS",
            question: "A small earthquake or tremor that occurs following a major one.",
            answer: "Aftershock"
        }
    }, {
        categoryNameMatches: /CROSSWORD CLUE/i,
        description: "The category gives the first letter of the correct answer. The clue gives the number of letters in the correct answer.",
        example: {
            category: "CROSSWORD CLUES \"H\"",
            question: "God of the underworld (5 letters)",
            answer: "Hades"
        }
    }, {
        categoryNameMatches: /FILE UNDER/i,
        description: "The correct answer starts with the given letter.",
        example: {
            category: "FILE UNDER \"Q\"",
            question: "The 4-sided center area of a college campus.",
            answer: "Quad"
        }
    }, {
        categoryNameMatches: /WORDS IN/i, //might also be "WORDS FROM", but searching j-archive 
        description: "The correct answer can be formed from the word in the category title. Not in order, do not need to use all of them.",
        example: {
            category: "WORDS IN SEPTEMBER",
            question: "Neil Armstrong famously took a small one.",
            answer: "Step"
        }
    },
    /*{
        categoryNameMatches: /WORDS FROM/i,
        description: "The correct response can be formed from the ",
        example: {
            category: "WORDS FROM PLANETS",
            question: "A song from the eighth planet.",
            answer: "Tune [neptune is the eighth planet]"
        }
    },
    */
    {
        categoryNameMatches: /BEFORE (AND)|& AFTER/i,
        description: "The first and second parts of the correct answer share a word in common.",
        example: {
            question: "Doctor's office holding area feature that allows you to order food & drink to be delivered to you.",
            answer: "Waiting room service [waiting room + room service]"
        }
    }, {
        categoryNameMatches: /JEOPORTMANTEAU/i,
        description: "The correct answer is an artificial portmanteau.",
        example: {
            question: "Cone-shaped dwelling plus hide-your-face game played by youngsters.",
            answer: "Teepeekaboo [teepee + peekaboo]"
        }
    }, {
        categoryNameMatches: /STUPID ANSWER/i,
        description: "The correct answer appears in the question.",
        example: {
            question: "The Sahara Desert derives its name from an Arabic word meaning this.",
            answer: "Desert"
        }
    }, {
        categoryNameMatches: /SPELLING/i,
        description: "You have to spell out the answer.",
        example: {
            category: "GEOGRAPHIC SPELLING BEE",
            question: "The name of this large sea comes from words for \"middle of the land\".",
            answer: "M-E-D-I-T-E-R-R-A-N-E-A-N"
        }
    }, {
        categoryNameMatches: /COMMON BOND/i,
        description: "The correct answer is the connection between the given items.",
        example: {
            question: "Bad habits, footballs, buckets.",
            answer: "Things you kick"
        }
    }, {
        categoryNameMatches: /NAME.S THE SAME/i, //allow curly apostrophe
        description: "The names share the first or last word.",
        example: {
            category: "FIRST NAME'S THE SAME",
            question: "Gable, Clifford, Kent.",
            answer: "Clark"
        }
    }, {
        categoryNameMatches: /GET YOUR FACTS STRAIGHT/i,
        description: "Clues in this category present information about two similar-sounding names, one of which is stated in the clue and the other of which is the correct response.",
        example: {
            question: "If you're vulpine, you're like a fox; if you're lying on your back with your face upward, you're in this position.",
            answer: "Supine"
        }
    }, {
        categoryNameMatches: /ALSO A/i,
        description: "The correct response is also an unrelated thing.",
        example: {
            category: "ALSO A SCHOOL WORD",
            question: "It comes between phylum & order.",
            answer: "Class"
        }
    }, {
        categoryNameMatches: /SOUNDS LIKE/i,
        description: "The correct response sounds like an unrelated thing or person.",
        example: {
            category: "SOUNDS LIKE A BOAT PART",
            question: "To remove the shell or husk from beans or seeds.",
            answer: "Hull"
        }
    }, {
        categoryNameMatches: /RHYME TIME/i,
        description: "The correct response contains two rhyming words.",
        example: {
            question: "Type of paint for your dromedary.",
            answer: "Camel enamel"
        }
    }, {
        categoryNameMatches: /QUASI.RELATED PAIRS/i, //allow hyphen or any type of dash
        description: "The clue describes two unrelated people or things whose names are shared by a well-known pair.",
        example: {
            question: "One who monitors an exam & to risk money.",
            answer: "proctor & gamble"
        }
    }, {
        categoryNameMatches: /POTENT POTABLE/i,
        description: "The correct answer is an alcoholic drink.",
        example: {
            question: "It's the main alcoholic ingredient in a pina colada.",
            answer: "Rum"
        }
    }, {
        categoryNameMatches: /HOMOPHON/i, //match "homophone" or "homophonic"
        description: "Words that are pronounced the same but have different meaning. (May also have different spelling.)",
        example: {
            category: "HOMOPHONES",
            question: "A mineral supply & a paddle.",
            answer: "ore / oar"
        }
    }, {
        categoryNameMatches: /(POTPOURRI)|(HODGEPODGE)|(GOULASH)|(LEFTOVERS)/i,
        description: "It can be anything."
    }
]);