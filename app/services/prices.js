var prices = {
    competition: {
        1: {
            1: {
                price: 88000,
                first: {
                    first: 30000,
                    second: 20000,
                    third: 10000
                }
            },
            2: {
                price: 259500,
                first: {
                    first: 60000,
                    second: 50000,
                    third: 40000
                },
                second: 40000
            },
            3: {
                price: 584500,
                first: {
                    first: 150000,
                    second: 100000,
                    third: 70000
                },
                second: {
                    first: 70000,
                    second: 50000
                },
                third: 50000
            }
        },
        2: {
            1: {
                price: 70500,
                first: {
                    first: 25000,
                    second: 15000,
                    third: 10000
                }
            },
            2: {
                price: 199500,
                first: {
                    first: 50000,
                    second: 40000,
                    third: 30000
                },
                second: 30000
            },
            3: {
                price: 459500,
                first: {
                    first: 120000,
                    second: 80000,
                    third: 50000
                },
                second: {
                    first: 50000,
                    second: 40000
                },
                third: 40000
            }
        },
        3: {
            1: {
                price: 49500,
                first: {
                    first: 20000,
                    second: 10000,
                    third: 5000
                }
            },
            2: {
                price: 149500,
                first: {
                    first: 40000,
                    second: 30000,
                    third: 20000
                },
                second: 20000
            },
            3: {
                price: 359500,
                first: {
                    first: 100000,
                    second: 60000,
                    third: 40000
                },
                second: {
                    first: 40000,
                    second: 30000
                },
                third: 30000
            }
        },
    }
}

exports.getPrices = function(priceType) {
    return prices[priceType];
};
