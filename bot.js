const Discord = require('discord.js');
const { prefix } = require('./config.json');
let fs = require('fs');
let cron = require('cron');
require('dotenv').config();
let userDB = require('./database/user');
let userCommandDB = require('./database/userCommand');
let auctionDB = require('./database/auction');

//change buzzer status every 10 minutes
let buzzerStatus = require('./buzzerStatus');
let changeBuzzerStatusCron = new cron.CronJob('* 2 * * * *', changeStatusToTrue);
changeBuzzerStatusCron.start();

//discord bot
const DiscordBot = new Discord.Client();

DiscordBot.userJSON = require('./user.json');
DiscordBot.cardJSON = require('./card.json');
DiscordBot.auctionJSON = require('./auction.json');

DiscordBot.on('ready', () => {
    console.log(`Logged in as ${DiscordBot.user.tag}!`);

});

DiscordBot.once('ready', () => {
    console.log('Ready!');
});



//============================================================================================================================
//bot command
let index;
let commandContent;
let _;
let commandText;
let userIndex;

const userInfo = "userInfo";
const cardInfo = "cardInfo";
const codeInfo = "codeInfo";
const auctionInfo = "auctionInfo";
const evolveCardInfo = "evolveCardInfo";
const slotPlointConsume = -100;
const checkinPoints = 200;
const commandPoints = 20;
const evolveNeedAmount = 3;


const rulesText = '命令列表 - DC0.0.2'
    + '\n$checkin：每日登入領取 200 點'
    + '\n$info：查看個人資訊'
    + '\n$card：查看卡片資訊'
    + '\n$slot：花費 100 點數抽獎'
    + '\n$rank：查看點數排行榜'
    + '\n$sell cardName：販賣已擁有卡片 hello'
    + '\n$bid cardName 100：參加拍賣會，對 cardName 出價 100 點數，時限內價高者得該卡片'
    + '\n$evolve cardName：消耗 ' + evolveNeedAmount + ' 張 cardName 取得進化卡片'
    + '\n使用指令獲得點數，請多多使用指令活絡氣氛！';

const errorText = '輸入指令格式錯誤，請輸入 $help 查看指令列表';

//$help
DiscordBot.on('message', message => {
    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();


    if (commandText == `${prefix}help` && commandContent[1] == undefined) {
        if (!message.author.bot) {
            coroutineForEveryCommand(message.author.username, message.author.id);
        }
        if (isNewUserorNot(message.author.id)) {
            createNewUserInDB(message.author.username, message.author.id);
        } else {
            console.log("That's old user");
        }

        let userIDString = (message.author.id).toString();
        updateUserDB(userIDString);
        console.log(message.date);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);
        message.channel.send(rulesText);
    } else if (message.content.startsWith(`${prefix}help`)) {
        message.channel.send(errorText);
    }
})

//$checkin
//checkin reset at 9 am everyday
let checkinResetCron = new cron.CronJob('00 00 09 * * *', checkinReset);
checkinResetCron.start();
DiscordBot.on('message', message => {

    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    if (commandText == `${prefix}checkin` && commandContent[1] == undefined) {
        if (message.author.bot == false) {
            coroutineForEveryCommand(message.author.username, message.author.id);
        }
        index = changeIDtoIndex(message.author.id, index);
        if (DiscordBot.userJSON[userInfo][index].checkin == "off") {
            console.log(DiscordBot.userJSON[userInfo][index].checkin);
            DiscordBot.userJSON[userInfo][index].checkin = "on";
            console.log(DiscordBot.userJSON[userInfo][index].checkin);
            DiscordBot.userJSON[userInfo][index].points = DiscordBot.userJSON[userInfo][index].points + checkinPoints;

            message.channel.send('恭喜 '
                + message.author.username
                + '獲得 '
                + checkinPoints
                + ' 點數！\n目前共有：'
                + DiscordBot.userJSON[userInfo][index].points
                + '點數');
        } else if (DiscordBot.userJSON[userInfo][index].checkin == "on") {
            message.channel.send(message.author.username
                + " 今天已經完成 Checkin！\n每早 9 點重置");
        }

        let userIDString = (message.author.id).toString();
        updateJSON(DiscordBot.userJSON);
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);
    } else if (message.content.startsWith(`${prefix}checkin`)) {
        message.channel.send(errorText)
    }
});



//$info
//=======================================================================================================================================================================================================================
DiscordBot.on('message', message => {

    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    if (commandText == `${prefix}info` && commandContent[1] == undefined) {
        if (message.author.bot == false) {
            coroutineForEveryCommand(message.author.username, message.author.id);
        }

        index = changeIDtoIndex(message.author.id, index);

        message.channel.send(
            '用戶 '
            + message.author.username
            + ' 的資訊\nID：'
            + message.author.id
            + '\n點數：'
            + DiscordBot.userJSON[userInfo][index].points
            + ' 點');

        let userIDString = (message.author.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);
    } else if (message.content.startsWith(`${prefix}info`)) {
        message.channel.send(errorText)
    }
})


//>card
DiscordBot.on('message', message => {

    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();

    if (commandText == `${prefix}card` && commandContent[1] == undefined) {
        if (message.author.bot == false) {
            coroutineForEveryCommand(message.author.username, message.author.id);
        }
        let cardInfoArray = [];
        let noCardInfoArray = [];
        let evolveCardInfoArray = [];

        index = changeIDtoIndex(message.author.id, index);

        for (let i = 0; i < DiscordBot.userJSON[userInfo][index].card.length; i++) {
            if (DiscordBot.userJSON[userInfo][index].card[i].cardStatus == "on") {
                cardInfoArray.push('【' + DiscordBot.cardJSON[cardInfo][i].name + '】\n卡片效果：' + DiscordBot.cardJSON[cardInfo][i].ability
                    + '\n卡片張數：' + DiscordBot.userJSON[userInfo][index].card[i].cardAmount + ' 張\n');
            } else if (DiscordBot.userJSON[userInfo][index].card[i].cardStatus == "off") {
                noCardInfoArray.push('【' + DiscordBot.cardJSON[cardInfo][i].name + '】\n卡片效果：' + DiscordBot.cardJSON[cardInfo][i].ability + '\n');
            }
        }
        for (let i = 0; i < DiscordBot.userJSON[userInfo][index].evolveCard.length; i++) {
            //evolve card info display
            if (DiscordBot.userJSON[userInfo][index].evolveCard[i].cardStatus == "on") {
                evolveCardInfoArray.push('【' + DiscordBot.cardJSON[evolveCardInfo][i].name + '】\n卡片效果：' + DiscordBot.cardJSON[evolveCardInfo][i].ability
                    + '\n卡片張數：' + DiscordBot.userJSON[userInfo][index].evolveCard[i].cardAmount + ' 張\n');
            }
        }

        if (cardInfoArray.length == 0) {
            cardInfoArray.push('\n暫時無卡片，請參加抽獎活動抽取！\n');
        }
        cardInfoArray = cardInfoArray.join('');

        if (noCardInfoArray.length == 0) {
            noCardInfoArray.push('\n你已獲得所有卡片，嘗試累積卡片，獲得特殊卡片！\n');
        }
        noCardInfoArray = noCardInfoArray.join('');

        if (evolveCardInfoArray.length == 0) {
            evolveCardInfoArray.push('\n暫時無卡片，請參加抽獎活動抽取卡片來進化！')
        }
        evolveCardInfoArray = evolveCardInfoArray.join('');

        let userIDString = (message.author.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);

        message.channel.send(message.author.username + ' 的卡片資訊\n擁有卡片：\n' + cardInfoArray
            + '\n尚未擁有卡片：\n' + noCardInfoArray + '\n\n＊特殊卡牌：\n' + evolveCardInfoArray);
    } else if (message.content.startsWith(`${prefix}card`)) {
        message.channel.send(errorText);
    }
})


//>slot
DiscordBot.on('message', message => {
    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    if (commandText == `${prefix}slot` && commandContent[1] == undefined) {
        if (message.author.bot == false) {
            coroutineForEveryCommand(message.author.username, message.author.id);
        }

        let slotPrize;
        message.channel.send(message.author.username
            + ' 開始抽獎！');

        index = changeIDtoIndex(message.author.id, index);

        if (DiscordBot.userJSON.userInfo[index].points + slotPlointConsume < 0) {
            message.channel.send(message.author.username
                + ' 點數不足無法抽獎！')
        } else {
            slotPrize = slot(index, slotPrize);
            message.channel.send(message.author.username
                + ' 消耗 '
                + (-slotPlointConsume)
                + ' 點...\n'
                + slotPrize
                + ' \n剩餘點數 '
                + DiscordBot.userJSON[userInfo][index].points
                + ' 點');
        }

        let userIDString = (message.author.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);

    } else if (message.content.startsWith(`${prefix}slot`)) {
        message.channel.send(errorText);
    }
})

//>rank
DiscordBot.on('message', message => {

    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    if (commandText == `${prefix}rank` && commandContent[1] == undefined) {
        if (message.author.bot == false) {
            coroutineForEveryCommand(message.author.username, message.author.id);
        }

        let rankArray = [];
        let rankDisplay = ['點數排行榜\n'];
        rankArray = rankPoints(rankArray);
        for (let i = 0; i < rankArray[1].length; i++) {
            if (rankArray[1][i] != rankArray[1][i + 1]) {
                rankDisplay.push('【第 ' + (i + 1) + ' 名】： ' + rankArray[1][i] +
                    ' ，共 ' + rankArray[0][i] + ' 分\n');
            } else {
                for (let j = 0; j < (rankArray[0].length - i); j++) {
                    if (rankArray[0][i] == rankArray[0][i + j] && rankArray[0][i] != undefined) {
                        rankDisplay.push('第 ' + (i + 1) + ' 名： ' + rankArray[1][i + j] +
                            ' 共 ' + rankArray[0][i + j] + ' 分\n');
                    }
                }
            }
        }
        rankDisplay = rankDisplay.join('');

        let userIDString = (message.author.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);

        message.channel.send(rankDisplay);
    } else if (message.content.startsWith(`${prefix}rank`)) {
        message.channel.send(errorText)
    }
})

//>sell
DiscordBot.on('message', message => {

    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();

    if (commandText == `${prefix}sell`) {
        if (message.author.bot == false) {
            coroutineForEveryCommand(message.author.username, message.author.id);
        }

        let _;
        let getSellCard;
        let cardName;
        let cardIndex;
        let isSelling;

        _, getSellCard = message.content.split(' ', 2);
        cardName = getSellCard[1];
        console.log(cardName);
        cardIndex = getSellCardIndex(cardName)
        isSelling = checkIsSellingorNot(isSelling);
        index = changeIDtoIndex(message.author.id);

        if (cardIndex == undefined) {
            message.channel.send('卡片名稱輸入錯誤，請輸入 $card 確認');
        } else {
            if (!isSelling) {
                if (checkUserHaveCardorNot(index, cardIndex)) {
                    //console.log('can sell ' + cardName);
                    updateSellingStatus(cardIndex, "true", message.author.username);
                    message.channel.send(message.author.username + ' 正在出售卡片：' + cardName + '\n有興趣的買家請儘速出價，出價時間為 10 分鐘！！');
                    let sellTimeInterval = setTimeout(function () {
                        //highestBidPoint = getHighestPoint();
                        updateSellingStatus(cardIndex, "false", message.author.username);
                        let bidder = DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray[DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray.length - 1];
                        let bidPoint = parseInt(DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray[DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray.length - 1]);
                        winningBidderGetCard(bidder, cardIndex, bidPoint);

                        if (bidder == message.author.username) {
                            message.channel.send(cardName + " 的拍賣會已經結束，無人競拍，卡片歸還原主");
                        } else {
                            message.channel.send(cardName + " 的拍賣已經結束，由 "
                                + DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray[DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray.length - 1]
                                + " 以 " + DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray[DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray.length - 1]
                                + " 點數得標 ").catch(console.error);
                        }
                        DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray = ["Seller"];
                        DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray = [0];
                        console.log(DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray);
                    }, 10 * 60 * 1000);


                } else if (!checkUserHaveCardorNot(index, cardIndex)) {
                    message.channel.send("尚未擁有該卡片，無法出售 " + cardName);
                }
            } else {
                message.channel.send("正在出售卡片，請等拍賣會結束再進行出售！")
            }
        }
        let userIDString = (message.author.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);

    } else if (message.content.startsWith(`${prefix}sell`)) {
        message.channel.send(errorText)
    }
})

//>bid
DiscordBot.on('message', message => {

    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    console.log(commandContent);

    if (commandText == `${prefix}bid`) {
        if (message.author.bot == false) {
            coroutineForEveryCommand(message.author.username, message.author.id);
            console.log("coroutineForEveryCommand");
        }

        let getBidCard;
        let cardName;
        let cardIndex;
        let bidPrice;
        let bidPriceArray = [];
        let bidUsernameArray = [];

        _, getBidCard = message.content.split(' ', 3);
        cardName = getBidCard[1];
        bidPrice = parseInt(getBidCard[2], 10);
        cardIndex = getSellCardIndex(cardName)
        userIndex = changeIDtoIndex(message.author.id);

        console.log(cardIndex);

        if (cardIndex == undefined) {
            message.channel.send("卡片名稱輸入錯誤，請輸入：$card 來查看卡片資訊");
        } else if (getBidCard[2] == undefined || bidPrice == undefined) {
            message.channel.send("格式錯誤，請輸入：$help 來查看正確用法")
        } else {
            if (canBidorNot(cardIndex)) {
                if (bidPrice <= DiscordBot.userJSON[userInfo][userIndex].points) {
                    bidPriceArray = DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray;
                    //console.log(bidPriceArray);
                    bidUsernameArray = DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray;
                    if (bidPriceArray == [] || bidPrice > bidPriceArray[bidPriceArray.length - 1]) {
                        if (message.author.username != DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray[0]) {
                            bidToAuctionJSON(message.author.username, bidPrice, bidPriceArray, bidUsernameArray);
                            message.channel.send(message.author.username + '成功出價！\n出價 ' + bidPrice + ' 點數，為目前最高價！');
                        } else {
                            message.channel.send("禁止哄抬物價，謝謝配合！");
                        }
                    } else if (bidPrice <= bidPriceArray[bidPriceArray.length - 1]) {
                        message.channel.send(message.author.username + '出價失敗！！\n目前最高出價為 '
                            + bidUsernameArray[bidUsernameArray.length - 1] + ' 的 ' + bidPriceArray[bidPriceArray.length - 1]
                            + ' 點，有興趣的買家請出高價競標！');
                    }
                } else {
                    message.channel.send(message.author.username + ' 點數不足，無法出價！');
                }
            } else if (!canBidorNot(cardIndex)) {
                message.channel.send("尚未有人出售該卡片，無法出價！");
            }
        }

        let userIDString = (message.author.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);

    } else if (message.content.startsWith(`${prefix}bid`)) {
        message.channel.send(errorText)
    }
})
//$evolve
DiscordBot.on('message', message => {


    _, commandContent = message.content.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();

    if (commandText == `${prefix}evolve`) {
        if (!message.author.bot) {
            coroutineForEveryCommand(message.author.username, message.author.id);
        }

        let _;
        let getBasicCard;
        let cardIndex;
        let cardname;

        _, getBasicCard = message.content.split(' ', 2);
        cardname = getBasicCard[1];

        cardIndex = getSellCardIndex(cardname);
        userIndex = changeIDtoIndex(message.author.id, userIndex);
        //console.log(cardIndex);

        if (cardIndex == undefined) {
            message.channel.send('卡片輸入錯誤，請輸入 $card 確認卡片名稱！');
        } else {
            if (DiscordBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount >= evolveNeedAmount) {
                evolveBasicCardToEvolveCoard(cardIndex, userIndex);
                message.channel.send(cardname + '成功進化\n恭喜 ' + message.author.username + ' 獲得特殊卡片【' + DiscordBot.cardJSON[evolveCardInfo][cardIndex].name + "】！！");
            } else if (DiscordBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount < evolveNeedAmount || DiscordBot.userJSON[userInfo].card[cardIndex].cardStatus == "off") {
                message.channel.send(cardname + '數量不足，無法進化！');
            }
        }

        let userIDString = (message.author.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.author.username,
            userIDString,
            commandText,
            message.date);

    } else if (message.content.startsWith(`${prefix}evolve`)) {
        message.channel.send(errorText)
    }
})

/*
============================================================================================================================
DB relate Function
*/

function writeDataIntoDB(database) {
    database.save(function (err) {
        if (err) throw err;
        console.log('Write in DB successfully');
    })
}
/* example write method
let chris = new userDB({
    username: 'Chris',
    userID: '1923102481'
});
writeDataIntoDB(chris);
*/

function createNewUserInDB(username, userID) {
    let newUser = new userDB({
        username: username,
        userID: userID,
        points: 0,
        commandAmount: 0,
        card: [
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            }],
        evolveCard: [
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            }
        ]
    })
    writeDataIntoDB(newUser);
}

function updateUserDB(userID) {
    index = changeIDtoIndex(userID);
    userDB.updateOne({ userID: userID },
        { points: DiscordBot.userJSON[userInfo][index].points }).then(result => {
            console.log(result);
        })

    userDB.updateOne({ userID: userID },
        { commandAmount: DiscordBot.userJSON[userInfo][index].commandAmount }).then(result => {
            console.log(result);
        })

    userDB.updateOne({ userID: userID },
        { checkin: DiscordBot.userJSON[userInfo][index].checkin }).then(result => {
            console.log(result);
        })
}

function updateUserCommandDB(username, userID, commandText, date) {
    let userCommandInfo = new userCommandDB({
        userID: userID,
        username: username,
        commandText: commandText,
        timeStamp: date
    })
    writeDataIntoDB(userCommandInfo);
}

function getDatabase(userID) {

    return userDB.findOne({ userID: userID }).exec();


    //return myJson.user;
    //console.log(doc);
    /*userID1 = doc.userID;
    console.log('userID1');
    console.log(userID1);
    console.log('userID1');
})
return userID1;*/

}

function updateAuctionDB() {

}

function changeStatusToTrue() {
    buzzerStatus.updateOne({ sendWarningToSlackorNot: false },
        { sendWarningToSlackorNot: true }).then(result => {
            console.log(result);
        })
}

/*
============================================================================================================================
Bot Function
*/
function updateJSON(json) {
    fs.writeFile('./user.json', JSON.stringify(json, null, 4), err => {
        if (err) throw err;
    })
}

function isNewUserorNot(userID) {
    for (let i = 0; i < DiscordBot.userJSON[userInfo].length; i++) {
        if (DiscordBot.userJSON[userInfo][i].userID != userID) {
            return true;
        } else {
            console.log("it's old user");
        }
    }
}

function coroutineForEveryCommand(username, id) {
    updateUserID(username, id);
    userIndex = changeIDtoIndex(id, userIndex);
    updateCommandAmount(userIndex);
    updatePoint(userIndex, commandPoints);
    updateJSON(DiscordBot.userJSON);
}


function updateUserID(userName, id) {

    for (let i = 0; i < DiscordBot.userJSON[userInfo].length; i++) {
        if (userName == DiscordBot.userJSON[userInfo][i].username) {
            DiscordBot.userJSON[userInfo][i].userID = parseInt(id);
            console.log("Parse userID");
            break;
        } else if (DiscordBot.userJSON[userInfo][i].username == "test") {
            DiscordBot.userJSON[userInfo][i].username = userName;
            DiscordBot.userJSON[userInfo][i].userID = parseInt(id);
            break;
        }
    }
    updateJSON(DiscordBot.userJSON);
}


function updateCommandAmount(userIndex) {
    DiscordBot.userJSON[userInfo][userIndex].commandAmount += 1;
}

function updatePoint(userIndex, point) {
    DiscordBot.userJSON[userInfo][userIndex].points += point;
}

function checkinReset() {
    console.log("checkinReset at 9 am everyday");
    for (let i = 0; i < DiscordBot.userJSON[userInfo].length; i++) {
        DiscordBot.userJSON[userInfo][i].checkin = "off";
        console.log('Reset checkin ' + DiscordBot.userJSON[userInfo][i].username);
    }
}



function changeIDtoIndex(id, index) {
    for (let i = 0; i < DiscordBot.userJSON[userInfo].length; i++) {
        if (id == DiscordBot.userJSON[userInfo][i].userID) {
            index = i;
        }
    }
    return index;
}



function rankPoints(rankArray) {
    let pointsArray = [];
    let topPointsArray = [];
    let topNameArray = [];
    for (i = 0; i < DiscordBot.userJSON[userInfo].length; i++) {
        if (DiscordBot.userJSON[userInfo][i].username != "test") {
            pointsArray.push(DiscordBot.userJSON[userInfo][i].points);
        }
    }
    //sort points array
    pointsArray = bubbleSort(pointsArray);

    //only display Top10
    if (pointsArray.length < 10) {
        for (let i = 1; i <= pointsArray.length; i++) {
            topPointsArray.push(pointsArray[pointsArray.length - i]);
        }
    } else if (pointsArray.length >= 10) {
        for (let i = 1; i <= 10; i++) {
            topPointsArray.push(pointsArray[pointsArray.length - i]);
        }
    }


    //infer name array
    for (let i = 0; i < topPointsArray.length; i++) {
        for (let j = 0; j < DiscordBot.userJSON[userInfo].length; j++) {
            if (topPointsArray[i] == DiscordBot.userJSON[userInfo][j].points) {
                //sort name array
                if (topNameArray.length == 0) {
                    topNameArray.push(DiscordBot.userJSON[userInfo][j].username);
                } else {
                    for (let k = 0; k < topNameArray.length; k++) {
                        if (topNameArray[0] != undefined && topNameArray[i] != DiscordBot.userJSON[userInfo][j].username) {
                            topNameArray.push(DiscordBot.userJSON[userInfo][j].username);

                        }
                    }
                }
            }
        }
    }
    console.log('topNameArray' + topNameArray);


    for (let i = 0; i < 2; i++) {
        rankArray[i] = [];
        for (let j = 0; j < topPointsArray.length; j++) {
            if (i == 0) {
                rankArray[i][j] = topPointsArray[j];
            } else if (i == 1) {
                rankArray[i][j] = topNameArray[j];
            }
        }
    }
    return rankArray;
}

function slot(index, slotPrize) {
    let slotPoint = GetRandomNum(1, 200);
    let slotCard = GetRandomNum(1, 10);
    let random = GetRandomNum(0, 1);

    if (random == 0) {
        DiscordBot.userJSON[userInfo][index].points = DiscordBot.userJSON[userInfo][index].points + slotPoint + slotPlointConsume;
        slotPrize = '恭喜獲得' + slotPoint + ' 點！';
    } else if (random == 1) {
        let cardIndex = slotCard - 1;
        DiscordBot.userJSON[userInfo][index].points = DiscordBot.userJSON[userInfo][index].points + slotPlointConsume;
        if (DiscordBot.userJSON[userInfo][index].card[cardIndex].cardAmount == 0) {
            DiscordBot.userJSON[userInfo][index].card[cardIndex].cardStatus = "on";
            DiscordBot.userJSON[userInfo][index].card[cardIndex].cardAmount = 1;
        } else {
            DiscordBot.userJSON[userInfo][index].card[cardIndex].cardAmount += 1;
        }
        slotPrize = '恭喜獲得【' + DiscordBot.cardJSON[cardInfo][cardIndex].name + '】';
    }
    console.log(DiscordBot.userJSON[userInfo][index].card)
    updateJSON(DiscordBot.userJSON);

    return slotPrize;
}


function getPointsFromToken(id, code, result) {

    let pointsFromToken;
    if (code == undefined) {
        result = "格式錯誤，請輸入 $help 以確認用法！";
    } else {
        for (let i = 0; i < DiscordBot.codeJSON[codeInfo].length; i++) {
            if (code == DiscordBot.codeJSON[codeInfo][i].privateKey) {
                if (DiscordBot.codeJSON[codeInfo][i].status == "on") {
                    pointsFromToken = DiscordBot.codeJSON[codeInfo][i].points;
                    DiscordBot.codeJSON[codeInfo][i].status = "off";
                    updateJSON(DiscordBot.codeJSON);
                    for (let j = 0; j < DiscordBot.userJSON[userInfo].length; j++) {
                        if (id == DiscordBot.userJSON[userInfo][j].userID) {
                            DiscordBot.userJSON[userInfo][j].points += pointsFromToken
                            updateJSON(DiscordBot.userJSON);
                        }
                    }
                    result = "積分兌換成功！！\n恭喜獲得 " + getErc + " 積分";
                    break;
                } else if (DiscordBot.codeJSON[codeInfo][i].status == "off") {
                    result = "序號已經被兌換！！\n若有問題，請聯繫客服！";
                    break;
                }
            } else {
                result = "序號輸入錯誤，請確序號再重新輸入！"
            }
        }
    }
    return result;
}


function getSellCardIndex(cardName) {
    for (let i = 0; i < DiscordBot.cardJSON[cardInfo].length; i++) {
        if (cardName == DiscordBot.cardJSON[cardInfo][i].name) {
            return i;
        }
    }
}
function checkUserHaveCardorNot(id, cardIndex) {
    for (let i = 0; i < DiscordBot.userJSON[userInfo].length; i++) {
        if (id == DiscordBot.userJSON[userInfo][i].userID) {
            if (DiscordBot.userJSON[userInfo][i].card[cardIndex].cardStatus == "on" &&
                DiscordBot.auctionJSON[auctionInfo][cardIndex].inAuction == "false") {
                return true;
            } else {
                return false;
            }
        }
    }
}
function checkIsSellingorNot(isSelling) {
    for (let i = 0; i < DiscordBot.auctionJSON[auctionInfo].length; i++) {
        if (DiscordBot.auctionJSON[auctionInfo][i].bidArray.usernameArray[0] != "Seller") {
            isSelling = true;
            break;
        } else {
            isSelling = false;
        }
    }
    return isSelling;
}

function updateSellingStatus(cardIndex, status, sellCardUsername) {

    DiscordBot.auctionJSON[auctionInfo][cardIndex].inAuction = status;
    DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray[0] = sellCardUsername;

    console.log(DiscordBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray);

    updateJSON(DiscordBot.auctionJSON);
}

function winningBidderGetCard(bidder, cardIndex, bidPoint) {
    for (let i = 0; i < DiscordBot.userJSON[userInfo].length; i++) {
        if (DiscordBot.userJSON[userInfo][i].username == bidder) {
            DiscordBot.userJSON[userInfo][i].card[cardIndex].cardAmount += 1;
            DiscordBot.userJSON[userInfo][i].card[cardIndex].cardStatus = "on";
            DiscordBot.userJSON[userInfo][i].points -= bidPoint;
        }
    }
    updateJSON(DiscordBot.userJSON);
}

function canBidorNot(cardIndex) {
    if (DiscordBot.auctionJSON[auctionInfo][cardIndex].inAuction == "true") {
        return true;
    } else if (DiscordBot.auctionJSON[auctionInfo][cardIndex].inAuction == "false") {
        return false;
    } else {
        return undefined;
    }
}

function bidToAuctionJSON(bidUsername, bidPrice, bidPriceArray, bidUsernameArray) {

    bidPrice = parseInt(bidPrice);
    bidPriceArray.push(bidPrice);
    console.log(bidPriceArray);

    bidUsernameArray.push(bidUsername);
    console.log(bidUsernameArray);

    updateJSON(DiscordBot.auctionJSON);

}

function evolveBasicCardToEvolveCoard(cardIndex, userIndex) {
    DiscordBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount -= evolveNeedAmount;
    console.log(DiscordBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount);
    if (DiscordBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount == 0) {
        DiscordBot.userJSON[userInfo][userIndex].card[cardIndex].cardStatus == "off";
    }
    DiscordBot.userJSON[userInfo][userIndex].userEvolveCard[cardIndex].cardAmount += 1;
    DiscordBot.userJSON[userInfo][userIndex].userEvolveCard[cardIndex].cardStatus = "on";

    updateJSON(DiscordBot.userJSON);

}

function wirteUserJSON() {
    fs.readFile('./user.json', function (err, userJSON) {
        if (err) {
            return console.error(err);
        }
        let user = userJSON.toString();
        user = JSON.parse(user);

        //writing all data in user.json except username == test || userID == 0
        for (let i = 0; i < user.userInfo.length; i++) {

            if (DiscordBot.userJSON[userInfo][i].userID != 0 && DiscordBot.userJSON[userInfo][i].username != "test") {

                user.userInfo[i].userID = DiscordBot.userJSON[userInfo][i].userID;
                user.userInfo[i].username = DiscordBot.userJSON[userInfo][i].username;
                user.userInfo[i].points = DiscordBot.userJSON[userInfo][i].points;
                user.userInfo[i].messageAmount = DiscordBot.userJSON[userInfo][i].messageAmount;
                for (let j = 0; j < user.userInfo[i].card.length; j++) {
                    user.userInfo[i].card[j].cardStatus = DiscordBot.userJSON[userInfo][i].card[j].cardStatus;
                    user.userInfo[i].card[j].selling = DiscordBot.userJSON[userInfo][i].card[j].selling;
                }
                user.userInfo[i].checkin = DiscordBot.userJSON[userInfo][i].checkin;
            }
        }

        let str = JSON.stringify(user);
        fs.writeFile('./user.json', str, function (err) {
            if (err) {
                console.error(err);
            }
            console.log('Write all changes into user.json');
        })
    })

}

function writeAuctionJSON() {
    fs.readFile('./auction.json', function (err, auctionJSON) {
        if (err) {
            return console.error(err);
        }
        let auction = auctionJSON.toString();
        auction = JSON.parse(auction);

        for (let i = 0; i < auction.auctionInfo.length; i++) {
            auction.auctionInfo[i].id = DiscordBot.auctionJSON[auctionInfo][i].id;
            auction.auctionInfo[i].name = DiscordBot.auctionJSON[auctionInfo][i].name;
            auction.auctionInfo[i].inAuction = DiscordBot.auctionJSON[auctionInfo][i].inAuction;
        }


        let str = JSON.stringify(auction);
        fs.writeFile('./auction.json', str, function (err) {
            if (err) {
                console.error(err);
            }
            console.log('Write all changes into auction.json');
        })
    })

}
function writeAllJSON() {
    wirteUserJSON();
    writeAuctionJSON();
    console.log('write user.json and auction.json at 4 am');
}

/*
============================================================================================================================
*/
function GetRandomNum(Min, Max) {
    let Range = Max - Min;
    let Rand = Math.random();
    return (Min + Math.round(Rand * Range));
}

function bubbleSort(array) {

    for (let i = 0; i < array.length; i++) {
        // 從第一個元素開始，不斷跑到第 n - 1 - i 個
        // 原本是 n - 1，會再加上 - i 是因為最後 i 個元素已經排好了
        // 所以沒必要跟那些排好的元素比較
        for (let j = 0; j < array.length - (i + 1); j++) {
            if (array[j] > array[j + 1]) {
                [array[j], array[j + 1]] = [array[j + 1], array[j]];
            }
        }
    }
    return array;
}

DiscordBot.login(process.env.BOT_TOKEN);//BOT_TOKEN is the DiscordBot Secret
