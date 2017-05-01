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
  res.render('index.jade');
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
  var investmentsWithNames = []
  var totalPortfolioValue = 0
  var totalInvestment = 0

  MongoClient.connect(URL, {
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000
  }, function(err, db) {
    if (err) {
      console.error('connect error:', err);
    }
    var col = db.collection('users');
    var cursor = col.aggregate([
      {
        $match : {
          userId: req.params.id
        }
      },
      {
        $lookup: {
          from: "investments",
          localField: "email",
          foreignField: "email",
          as: "userInvestments"
        }
      },
      {
        $project:{
          userId: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          isAdmin: 1,
          userInvestments: 1
        }
      }
    ]);
    cursor.on('data', function(user) {
      cursor.pause()
      request.get('https://poloniex.com/public?command=returnTicker', function(err, response, body){
        var price;
        var prices = JSON.parse(body)
        var userInvestments = user.userInvestments
        for(var i in userInvestments) {
          var investmentWithName = {}
          investmentWithName.userId = user.userId
          investmentWithName.email = userInvestments[i].email
          investmentWithName.fullName = user.firstName.charAt(0) + '. ' + user.lastName
          investmentWithName.usdInvestment = userInvestments[i].usdInvestment
          investmentWithName.cryptoType = userInvestments[i].cryptoType
          investmentWithName.cryptoAmount = userInvestments[i].cryptoAmount
          investmentWithName.cryptoPrice = userInvestments[i].cryptoPrice
          investmentsWithNames.push(investmentWithName)

          if (userInvestments[i].cryptoType === 'LTC') {
            price = prices.USDT_LTC.last
          }
          else if (userInvestments[i].cryptoType === 'ETH') {
            price = prices.USDT_ETH.last
          }
          else if (userInvestments[i].cryptoType === 'ETC') {
            price = prices.USDT_ETC.last
          }
          else if (userInvestments[i].cryptoType === 'GNT') {
            var etherprice = prices.USDT_ETH.last //no direct USD to GNT conversion
            var price = etherprice * prices.ETH_GNT.last
          }
          totalPortfolioValue = totalPortfolioValue + (price * userInvestments[i].cryptoAmount)
          totalInvestment = totalInvestment + userInvestments[i].usdInvestment
          cursor.resume()
        }
      })
    })
    cursor.on('error', function(err){
      console.error(err);
    })
    cursor.once('end', function() {
      var roi = Math.round( ( (totalPortfolioValue - totalInvestment) / totalInvestment) * 100)
      res.render('investments', {
        isAdmin: false,
        investments: investmentsWithNames,
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
    var investmentsWithNames = []
    var totalPortfolioValue = 0
    var totalInvestment = 0

    MongoClient.connect(URL, {
        connectTimeoutMS: 60000,
        socketTimeoutMS: 60000
      }, function(err, db) {
        if (err) {
          console.error('connect error:', err);
        }
        var col = db.collection('users');
        var cursor = col.aggregate([
          {
            $match : investmentQuery
          },
          {
            $lookup: {
                from: "investments",
                localField: "email",
                foreignField: "email",
                as: "userInvestments"
              }
          },
          {
            $project:{
              userId: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              isAdmin: 1,
              userInvestments: 1
            }
          }
        ]);
        cursor.on('data', function(user) {
          cursor.pause()
          request.get('https://poloniex.com/public?command=returnTicker', function(err, response, body){
            var price;
            var prices = JSON.parse(body)
            var userInvestments = user.userInvestments
            for(var i in userInvestments) {
              var investmentWithName = {}
              investmentWithName.userId = user.userId
              investmentWithName.email = userInvestments[i].email
              investmentWithName.fullName = user.firstName.charAt(0) + '. ' + user.lastName
              investmentWithName.usdInvestment = userInvestments[i].usdInvestment
              investmentWithName.cryptoType = userInvestments[i].cryptoType
              investmentWithName.cryptoAmount = userInvestments[i].cryptoAmount
              investmentWithName.cryptoPrice = userInvestments[i].cryptoPrice
              investmentsWithNames.push(investmentWithName)

              if (userInvestments[i].cryptoType === 'LTC') {
                price = prices.USDT_LTC.last
              }
              else if (userInvestments[i].cryptoType === 'ETH') {
                price = prices.USDT_ETH.last
              }
              else if (userInvestments[i].cryptoType === 'ETC') {
                price = prices.USDT_ETC.last
              }
              else if (userInvestments[i].cryptoType === 'GNT') {
                var etherprice = prices.USDT_ETH.last //no direct USD to GNT conversion
                var price = etherprice * prices.ETH_GNT.last
              }
              totalPortfolioValue = totalPortfolioValue + (price * userInvestments[i].cryptoAmount)
              totalInvestment = totalInvestment + userInvestments[i].usdInvestment
              cursor.resume()
            }
          })
        })
        cursor.on('error', function(err){
          console.error(err);
        })
        cursor.once('end', function() {
          var roi = Math.round( ( (totalPortfolioValue - totalInvestment) / totalInvestment) * 100)
          res.render('investments', {
            isAdmin: user.isAdmin,
            investments: investmentsWithNames,
            totalPortfolioValue: (Math.round(totalPortfolioValue * 100) / 100),
            usdInvestment: (Math.round(totalInvestment * 100) / 100),
            roi: roi
          })
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



app.post("/signup", (req, res) => {
  var userId = new Date().valueOf()
  var firstName = req.body.firstName
  var lastName = req.body.lastName
  var email = req.body.email
  var password = req.body.password
  var password_confirmation = req.body.password_confirmation
  createUser(userId, firstName, lastName, email, password, password_confirmation, function(err, user){
    if (err) { res.render('signup', { error: err }) }
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
      res.render('login', {error: err});
    }
    else{
      req.session.email = user.email;
      res.redirect('/investments');
    }
  });
});
app.post('/newInvestment', (req, res) => {
  var clientEmail = req.body.clientEmail
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
        usdInvestment: usdInvestment,
        cryptoType: cryptoType,
        cryptoAmount: cryptoAmount,
        cryptoPrice: cryptoPrice
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
