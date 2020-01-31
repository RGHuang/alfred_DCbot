const mongoose = require('mongoose');


//database configure
let db = mongoose.connection;
//連線失敗
db.on('error', console.error.bind(console, 'connection error:'));
//連線成功
db.once('open', function () {
    console.log("buzzerDB connection success...");
});
//建立連線
mongoose.connect('mongodb://localhost/buzzer');

let schema = mongoose.Schema;
//buzzerStatus schema model
let buzzerStatusSchema = new schema({
    sendWarningToSlackorNot: false
});


let buzzerStatus = mongoose.model('buzzerStatus', buzzerStatusSchema);

// make this available to our buzzerStatuss in our Node applications
module.exports = buzzerStatus;