require("dotenv").config();

const express = require("express"), app = express(), bodyParser = require("body-parser"),
      http = require("http"), PORT = process.env.PORT || 8080, IP = process.env.IP || "0.0.0.0",
      mongoose = require("mongoose"), methodOverride = require("method-override"),
      User = require("./models/user"), seedDB = require("./seeds"),
      passport = require("passport"), LocalStrategy = require("passport-local"),
      flash = require("connect-flash");
      //passportLocalMongoose = require("passport-local-mongoose");

const campgroundRoutes = require("./routes/campgrounds"),
      commentRoutes = require("./routes/comments"), indexRoutes = require("./routes/index");

//APP SETUP
mongoose.connect("mongodb://localhost/yelp_camp", { useNewUrlParser: true, useUnifiedTopology: true //:27017
, useFindAndModify: false, useCreateIndex: true }).then(() => console.log("Database connected"))
.catch(err => console.log(`Database connection error ${err.message}`)); //seedDB(); //seed the database
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public")); //console.log(__dirname);
app.use(methodOverride("_method"));
app.use(flash());

//PASSPORT SETUP
app.use(require("express-session")({
  secret: "Once again Rusty wins cutest dog!",
  resave: false, saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Middleware passing variable to all views
app.use(async function(req, res, next) {
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  res.locals.formatDistance = require("date-fns/formatDistance");
  if(req.user) { try { let user = await User.findById(req.user._id)
    .populate("notifications", null, { isRead: false }).exec();
    res.locals.notifications = user.notifications.reverse(); }
    catch(err) { console.log("app.use: notifcations Error", err); }
  } res.locals.currentUser = req.user; next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

//DEFAULT ROUTE
app.get("*", (req, res) => { console.log("GET " + req.url);
  res.send("Page not found...What are you doing with your life?");
});

//APP LISTENER
http.createServer(app).listen(PORT, IP, () => {
  console.log("The YelpCamp Server has started at http://" + IP + ":" + PORT);
});
