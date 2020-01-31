const mongoose = require('mongoose');

//database configure
let db = mongoose.connection;
//連線失敗
db.on('error', console.error.bind(console, 'evolveCard connection error:'));
//連線成功
db.once('open', function () {
    console.log("auction connection success...");
});
//建立連線
mongoose.connect('mongodb://localhost/alfred');

let schema = mongoose.Schema;


//card schema model
let auctionSchema = new schema({

});

let auction = mongoose.model('auction', auctionSchema);

// make this available to our users in our Node applications
module.exports = auction;
