//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");// install passport passport-local passport-local-mongoose express-session
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

//variable

var title = "";
var content = "";


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//starting a session
app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized: false
}));


//use passport package
app.use(passport.initialize());
//use passport package to start the session
app.use(passport.session());


// connect mongoose
mongoose.connect("mongodb://localhost:27017/blogDB", {useCreateIndex: true, useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true,});


//create schema
const postSchema =new mongoose.Schema({
  title: String,
  content: String,

});
// mongoose model
const Post = mongoose.model("Post", postSchema);




const userSchema = new mongoose.Schema( {
  email: String,
  password: String,
  googleId: String,
});

//encryption

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


//creating a model
const User = new mongoose.model("User", userSchema);




passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




app.get("/", function(req, res){
  res.render("root");
});

//home route
app.get("/home", function(req, res){

  if(req.isAuthenticated()){
    Post.find({},function(err, posts){
      res.render("home",{
        posts:posts,
       });
     });
  }else{
    res.redirect("/login");
  }


});

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/home",
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect to secrets.
  res.redirect('/home');

});

//login route
app.get("/login", function(req, res){
  req.logout();
  res.render("login");
});


// signup route
app.get("/signup", function(req, res){
  req.logout();
  res.render("signup");
});

//log out
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});




// /contact me route
app.get("/contact", function(req, res){
  res.render("contact",{contactContent:contactContent});
});


// /Compose route

app.get("/compose", function(req, res){
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/login");
  }
});


//posts:postname route
app.get("/posts/:postId", function(req, res){

const requestedPostId = req.params.postId;

  Post.findOne({_id: requestedPostId}, function(err, post){
    res.render("post", {
      title: post.title,
      content: post.content
    });
  });

});


app.post("/signup", function(req, res){
  req.logout();
  User.register({username:req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/signup");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });

});

app.post("/login", function(req, res){
  req.logout();
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });

});


app.post("/compose", function(req, res){
   const post = new Post({
     title: req.body.postTitle,
     content: req.body.postBody,
   });
   post.save(function(err){
     if(!err){
       res.redirect("/home");
     }
   });
});


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
