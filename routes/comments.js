const express = require("express"), router = express.Router({mergeParams: true}),
      Campground = require("../models/campground"), Comment = require("../models/comment"),
      middleware = require("../middleware");

//================================================//
// COMMENTS ROUTES
//================================================//

//NEW COMMENT
router.get("/new", middleware.isLoggedIn, (req, res) => {
  console.log("GET /campgrounds/" + req.params.id + "/comments/new");
  Campground.findById(req.params.id, (err, campground) => {
    if(err || !campground) {
      req.flash("error", "Campground not found");
      res.redirect("back");
    } else {
      res.render("comments/new", {campground: campground});
    }
  });
});

//CREATE COMMENT
router.post("/", middleware.isLoggedIn, (req, res) => {
  console.log("POST /campgrounds/" + req.params.id + "/comments");
  Campground.findById(req.params.id, (err, campground) => {
    if(err) { console.log(err);
      res.redirect("/campgrounds");
    } else {
      Comment.create(req.body.comment, (err, comment) => {
        if(err) { console.log(err);
          req.flash("error", "Something went wrong");
          res.redirect("/campgrounds/" + req.params.id);
        } else {
          //add username and id to comment
          //console.log("New comment's username will be: " + req.user.username);
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          //save comment
          comment.save();
          campground.comments.push(comment);
          campground.save((err, campground) => {
            if(err) console.log(err);
            else req.flash("success", "Successfully added comment");
            res.redirect("/campgrounds/" + req.params.id);
          });
        }
      });
    }
  });
});

//EDIT COMMENT
router.get("/:comment_id/edit", middleware.checkCommentOwnership, (req, res) => {
  console.log("GET /campgrounds/" + req.params.id + "/comments/" + req.params.comment_id + "/edit");
  Comment.findById(req.params.comment_id, (err, comment) => {
    if(err || !comment) { console.log(err);
      req.flash("error", "Comment not found");
      res.redirect("back");
    } else
      res.render("comments/edit", {campground_id: req.params.id, comment: comment});
  });
});

//UPDATE COMMENT
router.put("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  console.log("PUT /campgrounds/" + req.params.id + "/comments/" + req.params.comment_id);
  Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, comment) => {
    if(err) { console.log(err);
      res.redirect("back");
    } else
      res.redirect("/campgrounds/" + req.params.id);
  });
});

//DELETE COMMENT
router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  console.log("DELETE /campgrounds/" + req.params.id + "/comments/" + req.params.comment_id);
  Campground.findById(req.params.id, (err, campground) => {
    if(err) { console.log(err); req.flash("error", err.message); return res.redirect("back"); }
    Comment.findByIdAndRemove(req.params.comment_id, (err, comment) => { console.log("Deleted Comment:", comment);
      if(err) { console.log(err); req.flash("error", err.message); return res.redirect("back"); }
      //console.log("router.delete: Campground", campground.name, "- Comments:", campground.comments);
      //console.log("Index:", campground.comments.indexOf(req.params.comment_id));
      campground.comments.splice(campground.comments.indexOf(req.params.comment_id), 1); campground.save();
      //console.log("router.delete: Campground", campground.name, "- Comments:", campground.comments);
      req.flash("success", "Comment deleted"); res.redirect("/campgrounds/" + req.params.id);
    });
  });
});

//================================================//

module.exports = router;
