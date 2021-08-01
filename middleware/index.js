const Campground = require("../models/campground"), Comment = require("../models/comment");

// all the middleware goes here
const middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function(req, res, next) {
  if(req.isAuthenticated()){
    Campground.findById(req.params.id, (err, campground) => {
      if(err || !campground) { console.log(err);
        req.flash("error", "Campground not found"); res.redirect("back");
      } else if(campground) {
        if(req.user.isAdmin || (campground.author && campground.author.id.equals(req.user._id))) {
          return next();
        } else { req.flash("error", "You don't have permission to do that"); res.redirect("back"); }
      }
    });
  } else { req.flash("error", "You need to be logged in to do that"); res.redirect("back"); }
};

middlewareObj.checkCommentOwnership = function(req, res, next) {
  if(req.isAuthenticated()){
    Campground.findById(req.params.id, (err, campground) => {
      if(err || !campground) {
        req.flash("error", "Campground not found"); return res.redirect("back");
      }
      Comment.findById(req.params.comment_id, (err, comment) => {
        if(err || !comment) { console.log(err);
          req.flash("error", "Comment not found"); return res.redirect("back");
        }
        if(req.user.isAdmin || (comment.author && comment.author.id.equals(req.user._id))) {
          return next();
        } else { req.flash("error", "You don't have permission to do that"); res.redirect("back"); }
      });
    });
  } else { req.flash("error", "You need to be logged in to do that"); res.redirect("back"); }
};

//Middleware
middlewareObj.isLoggedIn = function(req, res, next) { //console.log("isLoggedIn:"); console.log("Authenticated - " + req.isAuthenticated());
  if(req.isAuthenticated()) { //console.log("Returning next()...");
    return next(); //next();
  } else {
    req.flash("error", "You need to be logged in to do that"); res.redirect("/login");
  }
};

module.exports = middlewareObj;
