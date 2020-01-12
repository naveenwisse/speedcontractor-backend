// Run this script with command: mongo plantedPeople script-22-may-18.js
var positions = [{
    name: "Banquet Manager",
    questions: [{
        question: "How organized was this person?",
        answers: [
            "Totally disorganized",
            "Good",
            "Rock Star"
        ]
    }, {
        question: "How well did they do with your alcohol and food sales?",
        answers: [
            "Dissapointing",
            "Good",
            "Exceeded expectations"
        ]
    }, {
        question: "How well did they do with balancing the books and payroll?",
        answers: [
            "Not adequate",
            "Good",
            "Wow!"
        ]
    }, {
        question: "How well did they do with the construction of the Banquest for your event?",
        answers: [
            "Messy",
            "Good",
            "Beautiful setup"
        ]
    }, {
        question: "Were there any issues with honesty or problems of any kind?",
        answers: [
            "Yes",
            "Not too many",
            "None"
        ]
    }, {
        question: "Would you hire this resource again?",
        answers: [
            "No",
            "Possibly",
            "Absolutely"
        ]
    }, {
        question: "How did they get along with the staff and clientele?",
        answers: [
            "Not well at all",
            "They sort of like them",
            "Great"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [4]
    }, {
        model: "dependability",
        questions: [0, 4, 5]
    }, {
        model: "punctuality",
        questions: [7]
    }, {
        model: "multitasks",
        questions: [0]
    }, {
        model: "attention",
        questions: [0]
    }, {
        model: "teamPlayer",
        questions: [6]
    }, {
        model: "clientFacing",
        questions: [4, 6]
    }, {
        model: "scheduling",
        questions: [0, 3]
    }, {
        model: "banquetConstruction",
        questions: [0, 1]
    }, {
        model: "overallSales",
        questions: [0]
    }, {
        model: "wineSales",
        questions: [1]
    }, {
        model: "foodSales",
        questions: [2]
    }, {
        model: "balancesBooks",
        questions: [0, 2]
    }, {
        model: "payroll",
        questions: [0]
    }]
}, {
    name: "Bar Back",
    questions: [{
        question: "Did they have some knowledge of the products behind your bar?",
        answers: [
            "Poor understanding",
            "Some understanding",
            "Full understanding"
        ]
    }, {
        question: "When business increased did they meet guest and business expectations?",
        answers: [
            "Didn't meet expectations",
            "Adequate",
            "Fully met expectations"
        ]
    }, {
        question: "How did they get along with the staff and clientele?",
        answers: [
            "Did not get along",
            "Adequately",
            "Very well"
        ]
    }, {
        question: "Did they cope well with the hours they worked?",
        answers: [
            "Poorly",
            "Good",
            "Hard worker"
        ]
    }, {
        question: "Were there any issues with honesty or problems of any kind?",
        answers: [
            "A lot of problems",
            "A few problems",
            "No problems at all"
        ]
    }, {
        question: "Did this person have a willingness to learn your system and adapt?",
        answers: [
            "Not at all",
            "Sort of",
            "Definitely"
        ]
    }, {
        question: "Would you hire this resource again?",
        answers: [
            "No",
            "Probably",
            "Yes"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [4]
    }, {
        model: "dependability",
        questions: [1, 6]
    }, {
        model: "punctuality",
        questions: [7]
    }, {
        model: "multitasks",
        questions: [1, 5]
    }, {
        model: "attention",
        questions: [1, 5]
    }, {
        model: "teamPlayer",
        questions: [2]
    }, {
        model: "clientFacing",
        questions: [1, 2, 4]
    }, {
        model: "overallSales",
        questions: [0]
    }, {
        model: "liquorKnowledge",
        questions: [0]
    }, {
        model: "wineKnowledge",
        questions: [0]
    }, {
        model: "beerKnowledge",
        questions: [0, 1]
    }, {
        model: "handlesVolume",
        questions: [1]
    }, {
        model: "handlesStress",
        questions: [1, 3]
    }, {
        model: "handlesLongHours",
        questions: [3]
    }, {
        model: "speed",
        questions: [1]
    }]
}, {
    name: "Bar Manager",
    questions: [{
        question: "Did they have full knowledge of the products behind your bar?",
        answers: [
            "Not well",
            "Decent",
            "Great"
        ]
    }, {
        question: "When business increased did they meet guest and business expectations?",
        answers: [
            "Didn't meet expectations",
            "Adequate",
            "Fully met expectations"
        ]
    }, {
        question: "How did they get along with the staff and clientele?",
        answers: [
            "Did not get along",
            "Adequately",
            "Very well"
        ]
    }, {
        question: "Did they cope well with the hours they worked?",
        answers: [
            "Poorly",
            "Good",
            "Hard worker"
        ]
    }, {
        question: "Were there any issues with honesty or problems of any kind?",
        answers: [
            "A lot of problems",
            "A few problems",
            "No problems at all"
        ]
    }, {
        question: "Did this person have a willingness to learn your system and adapt?",
        answers: [
            "Not at all",
            "Sort of",
            "Definitely"
        ]
    }, {
        question: "Did they meet your expectations for Scheduling, Inventory and Ordering?",
        answers: [
            "Not at all",
            "Sort of",
            "Fully met expectations"
        ]
    }, {
        question: "Were there any conflicts that needed to be solved? If yes How was it handled?",
        answers: [
            "Terribly",
            "Decent",
            "Expertly"
        ]
    }, {
        question: "How did this person do with promotions for business growth?",
        answers: [
            "No growth",
            "Some growth",
            "Wow!"
        ]
    }, {
        question: "How well did they perform using your computer systems?",
        answers: [
            "Not well at all",
            "Learned fairly well",
            "Hardly had to explain a thing"
        ]
    }, {
        question: "Would you recommend this person?",
        answers: [
            "No",
            "Probably",
            "Definitely"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [4]
    }, {
        model: "dependability",
        questions: [1, 3, 4, 7, 8, 9, 10]
    }, {
        model: "punctuality",
        questions: [11]
    }, {
        model: "multitasks",
        questions: [1, 5]
    }, {
        model: "attention",
        questions: [1, 5, 8]
    }, {
        model: "teamPlayer",
        questions: [2]
    }, {
        model: "clientFacing",
        questions: [1, 2, 4, 7]
    }, {
        model: "overallSales",
        questions: [0]
    }, {
        model: "liquorKnowledge",
        questions: [0]
    }, {
        model: "wineKnowledge",
        questions: [0]
    }, {
        model: "beerKnowledge",
        questions: [0]
    }, {
        model: "handlesVolume",
        questions: [1]
    }, {
        model: "handlesStress",
        questions: [1, 3, 7]
    }, {
        model: "handlesLongHours",
        questions: [1, 3]
    }, {
        model: "personable",
        questions: [1, 3, 7]
    }, {
        model: "speed",
        questions: [1]
    }, {
        model: "accuracy",
        questions: [1, 3]
    }, {
        model: "scheduling",
        questions: [6, 9]
    }, {
        model: "inventory",
        questions: [6, 9]
    }, {
        model: "ordering",
        questions: [6, 7, 9]
    }, {
        model: "conflictResolution",
        questions: [4]
    }, {
        model: "compsVoidsSales",
        questions: [9]
    }]
}, {
    name: "Bartender",
    questions: [{
        question: "Did they have full knowledge and understanding of all of the products behind your bar?",
        answers: [
            "Not well",
            "Decent",
            "Great"
        ]
    }, {
        question: "When business increased did they meet guest and business expectations?",
        answers: [
            "Didn't meet expectations",
            "Adequate",
            "Fully met expectations"
        ]
    }, {
        question: "How did they get along with the staff and clientele?",
        answers: [
            "Did not get along",
            "Adequately",
            "Very well"
        ]
    }, {
        question: "Did they cope well with the hours they worked?",
        answers: [
            "Poorly",
            "Good",
            "Hard worker"
        ]
    }, {
        question: "Were there any issues with honesty or problems of any kind?",
        answers: [
            "A lot of problems",
            "A few problems",
            "No problems at all"
        ]
    }, {
        question: "Did this person have a willingness to learn your system and adapt?",
        answers: [
            "Not at all",
            "Sort of",
            "Definitely"
        ]
    }, {
        question: "Would you hire this person again?",
        answers: [
            "No",
            "Probably",
            "Definitely"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [4]
    }, {
        model: "dependability",
        questions: [1, 3, 4, 6]
    }, {
        model: "punctuality",
        questions: [7]
    }, {
        model: "multitasks",
        questions: [1, 5]
    }, {
        model: "attention",
        questions: [1, 5]
    }, {
        model: "teamPlayer",
        questions: [2]
    }, {
        model: "clientFacing",
        questions: [1, 2, 4]
    }, {
        model: "overallSales",
        questions: [0]
    }, {
        model: "liquorKnowledge",
        questions: [0]
    }, {
        model: "wineKnowledge",
        questions: [0]
    }, {
        model: "beerKnowledge",
        questions: [0]
    }, {
        model: "handlesVolume",
        questions: [1]
    }, {
        model: "handlesStress",
        questions: [1, 3]
    }, {
        model: "handlesLongHours",
        questions: [1, 3]
    }, {
        model: "personable",
        questions: [1, 3]
    }, {
        model: "speed",
        questions: [1]
    }, {
        model: "accuracy",
        questions: [1, 3]
    }]
}, {
    name: "Busser",
    questions: [{
        question: "Did they have full knowledge and understanding of all of the products behind your bar?",
        answers: [
            "Not so much",
            "Decent",
            "Great"
        ]
    }, {
        question: "Did they control their section to the server's satisfaction?",
        answers: [
            "No",
            "Adequate",
            "Always under control"
        ]
    }, {
        question: "Did they work well in a group environment and help out with even the smallest things?",
        answers: [
            "Not at all",
            "Adequately",
            "Very helpful"
        ]
    }, {
        question: "Did they cope well with the hours they worked?",
        answers: [
            "Poorly",
            "Good",
            "Hard worker"
        ]
    }, {
        question: "Were there any issues with honesty or problems of any kind?",
        answers: [
            "A lot of problems",
            "A few problems",
            "No problems at all"
        ]
    }, {
        question: "Did this person have a willingness to learn your system and adapt?",
        answers: [
            "Not at all",
            "Sort of",
            "Definitely"
        ]
    }, {
        question: "Would you hire this person again?",
        answers: [
            "No",
            "Probably",
            "Definitely"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [4]
    }, {
        model: "dependability",
        questions: [1, 2, 3, 4, 6]
    }, {
        model: "punctuality",
        questions: [7]
    }, {
        model: "multitasks",
        questions: [1, 5]
    }, {
        model: "attention",
        questions: [1, 2, 5]
    }, {
        model: "teamPlayer",
        questions: [1, 2]
    }, {
        model: "clientFacing",
        questions: [1, 4]
    }, {
        model: "overallSales",
        questions: [0]
    }, {
        model: "liquorKnowledge",
        questions: [0]
    }, {
        model: "wineKnowledge",
        questions: [0]
    }, {
        model: "beerKnowledge",
        questions: [0]
    }, {
        model: "handlesVolume",
        questions: [1]
    }, {
        model: "handlesStress",
        questions: [1, 3]
    }, {
        model: "handlesLongHours",
        questions: [3]
    }, {
        model: "personable",
        questions: [1, 3, 5]
    }, {
        model: "speed",
        questions: [1, 5]
    }, {
        model: "accuracy",
        questions: [1]
    }, {
        model: "tableConsolidation",
        questions: [2]
    }]
}, {
    name: "Cocktail Server",
    questions: [{
        question: "Did they have full knowledge and understanding of all of the products behind your bar?",
        answers: [
            "Not at all",
            "Decent knowledge",
            "Full knowledge"
        ]
    }, {
        question: "When business increased did they meet guest and business expectations?",
        answers: [
            "Didn't meet expectations",
            "Adequate",
            "Fully met expectations"
        ]
    }, {
        question: "How did they get along with the staff and clientele?",
        answers: [
            "Did not get along",
            "Adequately",
            "Very well"
        ]
    }, {
        question: "Did they cope well with the hours they worked?",
        answers: [
            "Poorly",
            "Good",
            "Hard worker"
        ]
    }, {
        question: "Were there any issues with honesty or problems of any kind?",
        answers: [
            "A lot of problems",
            "A few problems",
            "No problems at all"
        ]
    }, {
        question: "Any honesty issues?",
        answers: [
            "Yes",
            "Some",
            "None"
        ]
    }, {
        question: "Did this person have a willingness to learn your system and adapt?",
        answers: [
            "Not at all",
            "Sort of",
            "Definitely"
        ]
    }, {
        question: "Would you hire this person again?",
        answers: [
            "No",
            "Maybe",
            "Definitely"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [5]
    }, {
        model: "dependability",
        questions: [1, 3, 5]
    }, {
        model: "punctuality",
        questions: [8]
    }, {
        model: "multitasks",
        questions: [1, 6]
    }, {
        model: "attention",
        questions: [1, 6]
    }, {
        model: "teamPlayer",
        questions: [2, 4]
    }, {
        model: "clientFacing",
        questions: [1, 2, 4]
    }, {
        model: "overallSales",
        questions: [0]
    }, {
        model: "liquorKnowledge",
        questions: [0]
    }, {
        model: "wineKnowledge",
        questions: [0]
    }, {
        model: "beerKnowledge",
        questions: [0]
    }, {
        model: "handlesVolume",
        questions: [1]
    }, {
        model: "handlesStress",
        questions: [1, 3]
    }, {
        model: "handlesLongHours",
        questions: [1, 3]
    }, {
        model: "personable",
        questions: [1, 3, 4]
    }, {
        model: "speed",
        questions: [1]
    }, {
        model: "tableConsolidation",
        questions: [1]
    }, {
        model: "accuracy",
        questions: [1]
    }]
}, {
    name: "Dining Room Server",
    questions: [{
        question: "Did they have full knowledge and understanding of all of the products behind your bar?",
        answers: [
            "Not at all",
            "Decent knowledge",
            "Full knowledge"
        ]
    }, {
        question: "When business increased did they meet guest and business expectations?",
        answers: [
            "Didn't meet expectations",
            "Adequate",
            "Fully met expectations"
        ]
    }, {
        question: "How did they get along with the staff and clientele?",
        answers: [
            "Did not get along",
            "Adequately",
            "Very well"
        ]
    }, {
        question: "Did they cope well with the hours they worked?",
        answers: [
            "Poorly",
            "Good",
            "Hard worker"
        ]
    }, {
        question: "Were there any issues with honesty or problems of any kind?",
        answers: [
            "A lot of problems",
            "A few problems",
            "No problems at all"
        ]
    }, {
        question: "Any honesty issues?",
        answers: [
            "Yes",
            "Some",
            "None"
        ]
    }, {
        question: "Did this person have a willingness to learn your system and adapt?",
        answers: [
            "Not at all",
            "Sort of",
            "Definitely"
        ]
    }, {
        question: "Would you hire this person again?",
        answers: [
            "No",
            "Maybe",
            "Definitely"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [5]
    }, {
        model: "dependability",
        questions: [1, 3, 5, 7]
    }, {
        model: "punctuality",
        questions: [8]
    }, {
        model: "multitasks",
        questions: [1, 6]
    }, {
        model: "attention",
        questions: [1, 6]
    }, {
        model: "teamPlayer",
        questions: [2, 4]
    }, {
        model: "clientFacing",
        questions: [1, 2, 4]
    }, {
        model: "overallSales",
        questions: [0]
    }, {
        model: "liquorKnowledge",
        questions: [0]
    }, {
        model: "wineKnowledge",
        questions: [0]
    }, {
        model: "beerKnowledge",
        questions: [0]
    }, {
        model: "handlesVolume",
        questions: [1]
    }, {
        model: "handlesStress",
        questions: [1, 3]
    }, {
        model: "handlesLongHours",
        questions: [1, 3]
    }, {
        model: "personable",
        questions: [1, 3, 4]
    }, {
        model: "speed",
        questions: [1]
    }, {
        model: "tableConsolidation",
        questions: [1]
    }, {
        model: "accuracy",
        questions: [1]
    }]
}, {
    name: "Floor Manager",
    questions: [{
        question: "Did they meet your requirements for scheduling and the Floor Plan?",
        answers: [
            "No",
            "Some",
            "Perfect"
        ]
    }, {
        question: "How did they get along with the staff and clientele?",
        answers: [
            "Not well",
            "Ok",
            "Met everyone's needs"
        ]
    }, {
        question: "Did they have a guest first mentality?",
        answers: [
            "No",
            "Somewhat",
            "Fully met our needs"
        ]
    }, {
        question: "Did they comply with company policy?",
        answers: [
            "Not at all",
            "THey did the job",
            "Exactly what we were looking for"
        ]
    }, {
        question: "Coordination from front of the house to back of the house?",
        answers: [
            "Did terribly",
            "Adequately",
            "Exactly what we were looking for"
        ]
    }, {
        question: "Did they meet your needs for restaurant satisfication?",
        answers: [
            "Not at all",
            "Some",
            "Fully"
        ]
    }, {
        question: "How did they do with your payroll?",
        answers: [
            "Not well",
            "Okay",
            "Very good job"
        ]
    }, {
        question: "How well did they perform using your computer systems?",
        answers: [
            "Terrible",
            "Okay",
            "Very well"
        ]
    }, {
        question: "Would you recommend this person?",
        answers: [
            "No",
            "Maybe",
            "Absolutely"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [8]
    }, {
        model: "dependability",
        questions: [3, 4, 5, 7, 8]
    }, {
        model: "punctuality",
        questions: [3]
    }, {
        model: "multitasks",
        questions: [4]
    }, {
        model: "attention",
        questions: [4]
    }, {
        model: "teamPlayer",
        questions: [1, 4]
    }, {
        model: "clientFacing",
        questions: [1, 2, 3, 4, 5]
    }, {
        model: "scheduling",
        questions: [0, 7]
    }, {
        model: "floorPlanLayout",
        questions: [0, 7]
    }, {
        model: "tableTouches",
        questions: [2, 4]
    }, {
        model: "conflictResolution",
        questions: [2, 4]
    }, {
        model: "balancesBooks",
        questions: [2, 7]
    }, {
        model: "payroll",
        questions: [6, 7]
    }, {
        model: "compsVoidsSales",
        questions: [7]
    }]
}, {
    name: "General Manager",
    questions: [{
        question: "How did they get along with the staff and clientele?",
        answers: [
            "Not well",
            "Okay",
            "Met everyone's needs"
        ]
    }, {
        question: "Did they improve the restaurants functionality and increase productivity?",
        answers: [
            "No",
            "A bit",
            "Extremely well"
        ]
    }, {
        question: "How did they do with your payroll?",
        answers: [
            "Not well",
            "Okay",
            "Very good job"
        ]
    }, {
        question: "Were there any conflicts and if so were they dealt with in a professional manner?",
        answers: [
            "Not well",
            "Somewhat",
            "Very professionally"
        ]
    }, {
        question: "Coordination from front of the house to back of the house?",
        answers: [
            "Inadequate",
            "Okay",
            "Excelled"
        ]
    }, {
        question: "How did this person do with promotions for business growth?",
        answers: [
            "Not well",
            "Decent",
            "Really great"
        ]
    }, {
        question: "Did they meet your requirements for scheduling and the Floor Plan?",
        answers: [
            "No",
            "Some",
            "Perfectly"
        ]
    }, {
        question: "How well did they perform using your computer sytems?",
        answers: [
            "Not good",
            "Fairly well",
            "Perfectly"
        ]
    }, {
        question: "Would you recommend this person?",
        answers: [
            "Nope",
            "Probably",
            "Absolutely"
        ]
    }, {
        question: "Did they show up on time?",
        answers: [
            "Late",
            "On time",
            "Early"
        ]
    }],
    terms: [{
        model: "trustworthy",
        questions: [8]
    }, {
        model: "dependability",
        questions: [1, 3, 4, 5, 7, 8]
    }, {
        model: "punctuality",
        questions: [9]
    }, {
        model: "multitasks",
        questions: [1, 4]
    }, {
        model: "attention",
        questions: [1, 4]
    }, {
        model: "teamPlayer",
        questions: [0, 4]
    }, {
        model: "clientFacing",
        questions: [0, 1, 3, 4]
    }, {
        model: "scheduling",
        questions: [6, 7]
    }, {
        model: "matradeeHosting",
        questions: [1]
    }, {
        model: "directionOfRestaurant",
        questions: [1]
    }, {
        model: "marketing",
        questions: [1, 5, 7]
    }, {
        model: "payroll",
        questions: [2, 7]
    }, {
        model: "conflictResolution",
        questions: [3]
    }, {
        model: "floorPlanLayout",
        questions: [6, 7]
    }, {
        model: "compsVoidsSales",
        questions: [7]
    }]
}];

const bulk = db.getCollection('positions').initializeUnorderedBulkOp();
positions.forEach(position => {
    bulk.insert(position);
});

bulk.execute();