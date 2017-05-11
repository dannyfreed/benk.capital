var dotenv = require('dotenv');
dotenv.load();

const URL = process.env.MONGODB_URI
const SALT_ROUNDS = 10;

const express = require('express')
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const supergoose = require('supergoose')
const MongoClient = require('mongodb').MongoClient
const session = require('express-session')
const MongoStore = require('connect-mongo')(session);
const bcrypt = require('bcrypt');
const _ = require('lodash')
const moment = require('moment');
const cors = require('cors')
const request = require('request')

const userModel = require('./models/users.js')(mongoose);
const investmentModel = require('./models/investments.js')(mongoose);

var options = { server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
replset: { socketOptions: { keepAlive: 1, connectTimeoutMS : 30000 } } };
// Mongo parameters
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('missing MONGODB_URI');
}
mongoose.connect(MONGODB_URI, options);
// If the connection throws an error
mongoose.connection.on('error',function (err) {
  console.log('Mongoose default connection error: ' + err);
});
// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});
// When successfully connected
mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection open');
});

///////////////////////////////
/////////Start up App/////////
/////////////////////////////
app.set('port', (process.env.PORT || 3000));
app.set('views', __dirname + '/views');
app.use('/public', express.static('public'));
app.set('view engine', 'jade');
app.set('view engine', 'jsx');
app.engine('jsx', require('express-react-views').createEngine());
app.use(session({
  secret: 'keyboard_cat',
  store: new MongoStore({
    ttl: 60 * 24 * 60 * 60, // = 60 day exp time)
    mongooseConnection: mongoose.connection,
    collection: 'cookieSessions'
  })
}));
app.use(bodyParser());
app.use(cors())

//For avoidong Heroku $PORT error
app.get('/', function(req, res) {
  if (req.session.email) {
    res.redirect('/investments')
  }
  else{
    res.render('index.jade');
  }
}).listen(app.get('port'), function() {
  console.log('App is running, server is listening on port ', app.get('port'));
});
app.get('/signup', function(req, res) {
  if (req.session.email) {
    res.redirect('/investments')
  }
  else{
    res.render('signup.jade');
  }
})
app.get('/login', function(req, res){
  if (req.session.email) {
    res.redirect('/investments')
  }
  else{
    res.render('login.jade')
  }
})
app.get('/logout', function(req, res){
  delete req.session.email;
  res.redirect('/');
});
app.get('/investments/:id', isAuthenticated, function(req, res){
  userModel.User.findOne({userId: req.params.id}, function(err, user){
    if (err) { console.error(err) }
    var investmentQuery = {email: user.email};
    getInvestments(investmentQuery, function(investments, totalPortfolioValue, totalInvestment) {
      var roi = Math.round( ( (totalPortfolioValue - totalInvestment) / totalInvestment) * 100)
      res.render('investments', {
        isAdmin: user.isAdmin,
        investments: investments,
        totalPortfolioValue: (Math.round(totalPortfolioValue * 100) / 100),
        usdInvestment: (Math.round(totalInvestment * 100) / 100),
        roi: roi
      })
    })
  })
})
app.get('/investments', isAuthenticated, function(req, res) {
  userModel.User.findOne({email: req.session.email}, function(err, user){
    if (err) { console.error(err) }
    var investmentQuery = {}
    if (!user.isAdmin) {
      investmentQuery = {email: user.email};
    }
    getInvestments(investmentQuery, function(investments, totalPortfolioValue, totalInvestment) {
      var roi = Math.round( ( (totalPortfolioValue - totalInvestment) / totalInvestment) * 100)
      res.render('investments', {
        isAdmin: user.isAdmin,
        investments: investments,
        totalPortfolioValue: (Math.round(totalPortfolioValue * 100) / 100),
        usdInvestment: (Math.round(totalInvestment * 100) / 100),
        roi: roi
      })
    })
  })
})
app.get('/investment/new', isAuthenticated, function(req, res) {
  var userEmailsAndNames = []
  userModel.User.find({}, function(err, users){
    //pass through user names + emails for dropdown (dropdown = client name, but value = email)
    for (var u in users) {
      var user = {}
      user.email = users[u].email
      user.firstName = users[u].firstName
      user.lastName = users[u].lastName
      userEmailsAndNames.push(user)
    }
    res.render('newInvestment', {userEmailsAndNames: userEmailsAndNames})
  })
})
app.get('/summary', isAuthenticatedAndAdmin, function(req, res) {
  var investmentQuery = {} //Only admins will have access to this route right now, so show all clients
  getInvestments(investmentQuery, function(investments, totalPortfolioValue, totalInvestment) {
    getCoinSummary(investments, function(coinSummary){
      res.render('summary', {
        coinSummary: coinSummary
      })
    })
  })
})


app.post("/signup", (req, res) => {
  var userId = new Date().valueOf()
  var firstName = req.body.firstName
  var lastName = req.body.lastName
  var email = req.body.email
  var password = req.body.password
  var password_confirmation = req.body.password_confirmation
  createUser(userId, firstName, lastName, email, password, password_confirmation, function(err, user){
    if (err) { res.render('signup.jade', { error: err }) }
    else {
      req.session.email = user.email;
      res.redirect('/investments');
    }
  });
})
app.post("/login", (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  authenticateUser(email, password, function(err, user){
    if (err) {
      console.log('Incorrect email/password');
      res.render('login.jade', {error: "Incorrect email/password"});
    }
    else{
      req.session.email = user.email;
      res.redirect('/investments');
    }
  });
});
app.post('/newInvestment', (req, res) => {
  var clientEmail = req.body.clientEmail
  var investmentDate = req.body.investmentDate
  var usdInvestment = req.body.usdInvestment
  var cryptoType = req.body.cryptoType
  var cryptoAmount = req.body.cryptoAmount
  var cryptoPrice = req.body.cryptoPrice
  userModel.User.findOne({email: clientEmail}, function(err, user){
    if (err) { console.error(err) }
    if (!user) {
      //do something
    }
    else {
      investmentModel.Investment.create({
        email: clientEmail,
        date: investmentDate,
        usdInvestment: usdInvestment,
        cryptoType: cryptoType,
        cryptoAmount: cryptoAmount,
        cryptoPrice: cryptoPrice,
        user: user
      }, function(err){
        if(err){
          console.error(err);
        }
        else{
          res.redirect('/investments')
        }
      })
    }
  })
})






////UTILITY FUNCTIONS/////
// This creates a new user and calls the callback with
// two arguments: err, if there was an error, and the created user
// if a new user was created.
//
// Possible errors: the passwords are not the same, and a user
// with that username already exists.
function createUser(userId, firstName, lastName, email, password, password_confirmation, callback){
  if (password !== password_confirmation) {
    var err = 'The passwords do not match';
    callback(err);
  } else {
    userModel.User.findOne({email: email}, function(err, user){
      if (err) { throwError(err) }
      if (user) {
        err = 'That email has already registered for an account';
        callback(err);
      }
      else{
        bcrypt.hash(password, SALT_ROUNDS, function(err, hash) {
          var user = {
            userId: userId,
            email: email,
            hash: hash,
            firstName: firstName,
            lastName: lastName
          }
          // Store hash in your password DB.
          userModel.User.create(user, function(err){
            if(err){ throwError(err) }
            callback(err, user)
          })
        });
      }
    })
  }
}
function isAuthenticated(req, res, next) {
  if (req.session.email) { return next() }
  // IF A USER ISN'T LOGGED IN, THEN REDIRECT THEM TO SIGNUP
  res.redirect('/login');
}
function isAuthenticatedAndAdmin(req, res, next) {
  if (! req.session.email) { res.redirect('/login') }
  else {
    userModel.User.findOne({email: req.session.email}, function(err, user){
      if (err) { console.error(err) }
      if (user.isAdmin) {
        return next()
      }
      else {
        res.sendStatus(400)
      }
    })
  }
}

// This finds a user matching the username and password that were given.
function authenticateUser(email, password, callback){
  userModel.User.findOne({email: email}, function(err, user){
    if (err) { callback(err) }
    if (!user) {
      err = "We can't find an account associated with that email"
      callback(err);
    }
    else{
      // Load hash from your password DB.
      bcrypt.compare(password, user.hash, function(err, res) {
        if (res === true) {
          callback(err, user)
        }
        else{
          err = "The password is incorrect"
          callback(err);
        }
      });
    }
  });
}

function getFullNameByEmail(email, callback){
  userModel.User.findOne({email: email}, function(err, user){
    if (err) { console.error(err) }
    var fullName = user.firstName + ' ' + user.lastName
    callback(fullName)
  })
}

function getCoinSummary(investments, cb){
  var holder = {};
  investments.forEach(function (d) {
    if(holder.hasOwnProperty(d.cryptoType)) {
       holder[d.cryptoType] = holder[d.cryptoType] + d.cryptoAmount;
    } else {
       holder[d.cryptoType] = d.cryptoAmount;
    }
  });
  var coinSummary = [];
  for(var prop in holder) {
    coinSummary.push({CURRENCY: prop, AMOUNT: holder[prop]});
  }
  cb(coinSummary);
}

function getInvestments(investmentQuery, cb) {
  var investmentsWithNames = []
  var totalPortfolioValue = 0
  var totalInvestment = 0
  getCoinPrices(function(coinPrices){
    investmentModel.Investment.find(investmentQuery, function(err, investments) {
      for (var i = 0; i < investments.length; i++) {
        var investmentWithName = {}
        var currentCointPrice = _.find(coinPrices, { 'coin': investments[i].cryptoType}).price

        investmentWithName.userId = investments[i].user.userId
        investmentWithName.email = investments[i].email
        investmentWithName.date = investments[i].date
        investmentWithName.fullName = investments[i].user.firstName.charAt(0) + '. ' + investments[i].user.lastName
        investmentWithName.usdInvestment = investments[i].usdInvestment
        investmentWithName.cryptoType = investments[i].cryptoType
        investmentWithName.cryptoAmount = investments[i].cryptoAmount
        investmentWithName.cryptoPrice = investments[i].cryptoPrice
        investmentWithName.currentPrice = parseFloat(currentCointPrice).toFixed(2)
        investmentsWithNames.push(investmentWithName)

        totalPortfolioValue = totalPortfolioValue + (currentCointPrice * investments[i].cryptoAmount)
        totalInvestment = totalInvestment + investments[i].usdInvestment
      }
      investmentsWithNames = _.sortBy(investmentsWithNames, ['date']);
      cb(investmentsWithNames, totalPortfolioValue, totalInvestment)
    })
  })

}
function calculatePortfolioSummary(userId) {
  totalPortfolioValue = totalPortfolioValue + (price * userInvestments[i].cryptoAmount)
  totalInvestment = totalInvestment + userInvestments[i].usdInvestment
}
function getCoinPrices(cb) {
  request.get('https://poloniex.com/public?command=returnTicker', function(err, response, body){
    if (err) {
      console.error(err)
    }
    else {
      var price;
      var prices = JSON.parse(body)

      var bitcoinPrice = prices.USDT_BTC.last
      var litecoinPrice = prices.USDT_LTC.last
      var ethereumPrice = prices.USDT_ETH.last
      var ethereumClassicPrice = prices.USDT_ETC.last
      var golemPrice = ethereumPrice * prices.ETH_GNT.last
      var ripplePrice = prices.USDT_XRP.last

      var coinPrices = [
        { coin: 'BTC',
          price: bitcoinPrice
        },
        { coin: 'LTC',
          price: litecoinPrice
        },
        { coin: 'ETH',
          price: ethereumPrice
        },
        { coin: 'ETC',
          price: ethereumClassicPrice
        },
        { coin: 'GNT',
          price: golemPrice
        },
        { coin: 'XRP',
          price: ripplePrice
        }
      ]
      cb(coinPrices)
    }
  })
}
