var fs = require('fs');
const mongo_host = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plantedPeople';
const config = {
  "basepath": "app/migrations",
  "connection": mongo_host,
  "current_timestamp": 0,
  "models": {
    "User": "app/models/user.js"
  }
}

fs.writeFile(__dirname+"/.migrate.json", JSON.stringify(config), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
});
