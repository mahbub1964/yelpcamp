const express = require("express"), router = express.Router(), async = require("async"),
      User = require("../models/user"), passport = require("passport"),
      Campground = require("../models/campground"), crypto = require("crypto"),
      middleware = require("../middleware"), nodemailer = require("nodemailer"),
      Notification = require("../models/notification");

//ROOT ROUTE
router.get("/", (req, res) => { console.log("GET /");
  res.render("landing");
});

//=========================
// AUTH ROUTES
//=========================

//Register Routes
router.get("/register", (req, res) => { console.log("GET /register");
  res.render("register");
});
router.post("/register", (req, res) => { console.log("POST /register");
  let newUser = new User({
    username: req.body.username, firstName: req.body.firstName, lastName: req.body.lastName,
    email: req.body.email, avatar: req.body.avatar,
  });
  if(req.body.adminCode === "secretcode123") newUser.isAdmin = true;
  User.register(newUser, req.body.password, (err, user) => {
    if(err) { console.log(err);
      req.flash("error", err.message);
      res.redirect("/register"); //return res.redirect("/register");
    } else passport.authenticate("local")(req, res, () => {
      req.flash("success", "Successfully Signed Up! Nice to meet you " + user.username);
      res.redirect("/campgrounds");
    });
  });
});

//Login Routes
router.get("/login", (req, res) => { console.log("GET /login");
  res.render("login");
});
router.post("/login", passport.authenticate("local", {
  successRedirect: "/campgrounds", failureRedirect: "/login", successFlash: "Welcome to YelpCamp!", failureFlash: true
}), (req, res) => {});

//Logout Route
router.get("/logout", (req, res) => { console.log("GET /logout");
  req.logout();
  req.flash("success", "See you later!");
  res.redirect("/campgrounds");
});

// forgot password
router.get("/forgot", (req, res) => { console.log("GET /forgot");
  res.render("forgot");
});
router.post("/forgot", (req, res, next) => { console.log("POST /forgot");
  async.waterfall([
    function(done) { crypto.randomBytes(20, (err, buf) => {
      const token = buf.toString("hex"); console.log("token: " + token);
      done(err, token);
    }); },
    function(token, done) { User.findOne({email: req.body.email}, (err, user) => {
      if(!user) { req.flash("error", "No account with that email address exists.");
        return res.redirect("/forgot");
      } user.resetPasswordToken = token; user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      console.log("Date.now():", Date.now(), "resetPasswordExpires:", user.resetPasswordExpires);
      user.save((err, user) => { done(err, token, user); });
    }); },
    function(token, user, done) {
      const smtpTransport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true,
        auth: { type: "OAuth2", user: process.env.GMAIL_USERNAME,
          clientId: process.env.OAUTH_CLIENT_ID, clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN, accessToken: process.env.OAUTH_ACCESS_TOKEN
      } });
      const mailOptions = { to: user.email, from: process.env.GMAIL_USERNAME, subject: "YelpCamp Password Reset",
        text: "You are receiving this because you (or someone else) have requested the reset of your YelpCamp password.\n\n" +
          "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
          "http://" + req.headers.host + "/reset/" + token + "\n\n" + 
          "If you did not request this, please ignore this mail and your password will remain unchanged."
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        if(err) { console.log("Mail could not be sent to " + user.email); console.log(err);
          req.flash("error", "Mail could not be sent to " + user.email + ".");
        } else { console.log("Mail sent to " + user.email + ".");
          req.flash("success", "Mail sent to " + user.email + " with further instructions.");
        } done(err, "done");
    }); }
  ], (err) => { if(err) { console.log(err); return next(err); }
    res.redirect("/forgot");
  });
});

// reset password
router.get("/reset/:token", (req, res) => { console.log("GET /reset/" + req.params.token);
  //User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()} }, (err, user) => {
  User.findOne({ resetPasswordToken: req.params.token }, (err, user) => {
    console.log("Date.now():", Date.now(), "user:", user);
    if(!user || user.resetPasswordExpires < Date.now()) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/forgot");
    }
    res.render("reset", {token: req.params.token});
  });
});
router.post("/reset/:token", (req, res) => { console.log("POST /reset/" + req.params.token);
  async.waterfall([
    function(done) {
      //User.findOne({ resetPasswordToken: req.params.token, resetPasswordToken: {$gt: Date.now()} }, (err, user) => {
      User.findOne({ resetPasswordToken: req.params.token }, (err, user) => {
        console.log("Date.now():", Date.now(), "user:", user);
        if(!user || user.resetPasswordExpires < Date.now()) {
          req.flash("error", "Password reset token is invalid or has expired."); return res.redirect("back");
        }
        if(req.body.password === req.body.confirm) { user.setPassword(req.body.password, (err) => {
          user.resetPasswordToken = undefined; user.resetPasswordExpires = undefined;
          user.save((err, user) => { req.logIn(user, (err) => { done(err, user); }); });
        }); } else {
          req.flash("error", "Passwords do not match."); return res.redirect("back");
        }
      });
    },
    function(user, done) {
      const smtpTransport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true,
        auth: { type: "OAuth2", user: process.env.GMAIL_USERNAME, 
          clientId: process.env.OAUTH_CLIENT_ID, clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN, accessToken: process.env.OAUTH_ACCESS_TOKEN
      } });
      const mailOptions = { to: user.email, from: process.env.GMAIL_USERNAME, subject: "Your YelpCamp Password has been changed",
        text: "Hello,\n\nThis is a confirmation that the password of your YelpCamp account " + user.email + " has just been changed."
      };
      smtpTransport.sendMail(mailOptions, (err) => { req.flash("success", "Your password has been changed."); done(err, "done"); });
    }
  ], (err) => { res.redirect("/campgrounds"); });
});

// USER PROFILE
router.get("/users/:id", (req, res) => { console.log("GET /users/" + req.params.id);
  //User.findById(req.params.id).populate("followers").exec((err, user) => {
  User.findById(req.params.id, (err, user) => {
    if(err || !user){ req.flash("error", "Something went wrong!"); return res.redirect("/"); }
    let following; if(req.user) following = (user.followers.indexOf(req.user.id) >= 0);
    User.populate(user, "followers", (err, user) => {
      Campground.find().where("author.id").equals(user._id).exec((err, campgrounds) => {
        if(err || !campgrounds){ req.flash("error", "Something went wrong!"); return res.redirect("/"); }
        res.render("users/show", { user, campgrounds, following }); //: user, : campgrounds
      });
  });});
});

// Follow User
router.get("/follow/:id", middleware.isLoggedIn, async function(req, res) {
  try { console.log("GET /follow/" + req.params.id);
    const user = await User.findById(req.params.id); console.log("User:",user);
    if(!user.email) user.email = user.username.toLowerCase().replace(/\s/g, "") + "@yelpcamp.com";
    user.followers.push(req.user._id); user.save();
    req.flash("success", "Successfully followed " + user.username + "!");
    res.redirect("/users/" + req.params.id);
  } catch(err) { console.log("Error", err);
    req.flash("error", err.message); res.redirect("back");
} });

// Unfollow User (Stop Following)
router.get("/unfollow/:id", middleware.isLoggedIn, async function(req, res) {
  try { console.log("GET /unfollow/" + req.params.id);
    const user = await User.findById(req.params.id);
    //user.followers.push(req.user._id); user.save();
    if(user.followers) { const index = user.followers.indexOf(req.user.id);
      if(index >= 0) { user.followers.splice(index, 1); user.save();
        req.flash("success", "Stopped following " + user.username + "!!");
    } } res.redirect("/users/" + req.params.id);
  } catch(err) { console.log("Error", err);
    req.flash("error", err.message); res.redirect("back");
} });

// View all notifications
router.get("/notifications", middleware.isLoggedIn, async function(req, res) {
  try { console.log("GET /notifications");
    const user = await User.findById(req.user._id).populate({
      path: "notifications", options: { sort: { "_id": -1 } }
    }).exec();
    res.render("notifications/index", { allNotifications: user.notifications });
  } catch(err) { console.log("Error", err);
    req.flash("error", err.message); res.redirect("back");
} });

// Handle notification
router.get("/notifications/:id", middleware.isLoggedIn, async function(req, res) {
  try { console.log("GET /notifications/" + req.params.id);
    const notification = await Notification.findById(req.params.id);
    notification.isRead = true; notification.save();
    res.redirect(`/campgrounds/${notification.campgroundId}`);
  } catch(err) { console.log("Error", err);
    req.flash("error", err.message); res.redirect("back");
} });

//=========================

module.exports = router;
