const boostableJobs = [
    "Bar Back",
    "Bar Manager",
    "Bartender",
    "Busser",
    "Cocktail Server",
    "Dining Room Server"
];

exports.getBoostableJobs = function() {
    return boostableJobs;
};

exports.getBoosts = function(products) {
    var boosts = [];
    if (products.length) {
        products.forEach(function(product) {
            if (product.type === 'Liquor') {
                if (!boosts.includes('liquorKnowledge')) boosts.push('liquorKnowledge');
            } else if (product.type === 'Wine') {
                if (!boosts.includes('wineKnowledge')) boosts.push('wineKnowledge');
            } else if (product.type === 'Beer') {
                if (!boosts.includes('beerKnowledge')) boosts.push('beerKnowledge');
            }
        });
    }
    return boosts;
};
