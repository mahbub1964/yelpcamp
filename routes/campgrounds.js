const express = require("express"), router = express.Router(), utility = require("../utility"),
      Campground = require("../models/campground"), middleware = require("../middleware"),
      multer = require("multer"), storage = multer.diskStorage({
        destination: function(req, file, cb){ cb(null, "./public/images"); },
        filename: function(req, file, cb){ cb(null, Date.now() + "_" + file.originalname); }
      }), upload = multer({ storage: storage, fileFilter: function(req, file, cb) {
        if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
          return cb(new Error("Only image files are allowed!"), flase);
        } cb(null, true);
      }}), fs = require("fs"),
      Notification = require("../models/notification"), User = require("../models/user");

//INDEX - show all campgrounds
router.get("/", (req, res) => { console.log("GET /campgrounds");
  let query = {}, heading = "Our Most Popular Campgrounds!"; //console.log(req.query);
  if(req.query.search){
    const search = escapeRegex(req.query.search), regex = new RegExp(search, "gi");
    query = {name: regex}; heading = search + " campgrounds"; //console.log(query);
  }
  // Get campgrounds from DB
  Campground.find(query, (err, campgrounds) => {
    if(err) console.log(err); //else console.log(campgrounds); //console.log(req.user);
    if(campgrounds.length < 1) heading = "No campgrounds match that query.";
    res.render("campgrounds/index", {campgrounds: campgrounds, heading: heading}); //, currentUser: req.user
  });
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single("image"), (req, res) => {
  console.log("POST /campgrounds"); console.log("req.file", req.file); console.log("req.body:", req.body);
  req.body.campground.image = "/images/" + req.file.filename;
  utility.saveCampground(req, (err, campground) => { if(err) { req.flash("error", err.message); 
    return res.redirect("back"); } console.log("router.post: Saved Campground", campground);
    req.flash("success", "The new campground is successfully added."); res.redirect("/campgrounds");
  });
  console.log("router.post: End of Code");
});

//NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, (req, res) => { console.log("GET /campgrounds/new");
  res.render("campgrounds/new");
});

//SHOW - shows more info about one campground
router.get("/:id", (req, res) => { console.log("GET /campgrounds/" + req.params.id);
  //find the campground with provided id
  Campground.findById(req.params.id).populate("comments").exec((err, campground) => {
    if(err || !campground) { //console.log(err);
      req.flash("error", "Campground not found"); res.redirect("back");
    } else { //render show template with that campground
      res.render("campgrounds/show", {campground: campground});
      //console.log("Looking for", campground.id, campground.name, "in all notifications:");
      //const qry = Notification.find({ campgroundId: campground.id });
      //qry.exec((err, notifications) => console.log("Notifications:", notifications, err));
      const agg = User.aggregate([ { $project: { salt: 0, hash: 0 } },
        { $unwind: "$notifications" },
        { $lookup: { from: Notification.collection.name,
          localField: "notifications", foreignField: "_id", as: "notification"
        } }, { $match: { "notification.campgroundId": campground.id } }
      ]);
      //agg.exec((err, users) => console.log("Users:", users, users.length, err));
    }
  });
  //res.send("THIS WILL BE THE SHOW PAGE ONEDAY!");
});

//EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
  console.log("GET /campgrounds/" + req.params.id + "/edit");
  Campground.findById(req.params.id, (err, campground) => {
    res.render("campgrounds/edit", {campground: campground});
  });
});

//UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), (req, res) => {
  console.log("PUT /campgrounds/" + req.params.id); //console.log("req.file", req.file); console.log("req.body", req.body);
  Campground.findById(req.params.id, async function(err, campground) {
    if(err) { console.log("Error", err);
      req.flash("error", err.message); return res.redirect("back");
    }
    //update the campground
    campground.name = req.body.name; campground.description = req.body.description;
    campground.price = req.body.price; req.body.campground = campground; console.log("req.file:", req.file);
    if(req.file) {
      if(campground.image) { fs.unlink("./public" + campground.image, (err) => { if (err) console.log(
        "failed to delete local image:", err); else console.log('successfully deleted local image:', campground.image);
      }); } utility.deleteFromCloud(campground); campground.image = "/images/" + req.file.filename;
    }
    utility.saveCampground(req, (err, campground) => { //console.log("Callback:", err, campground);
      if(err) { console.log("router.put: Error", err);
        req.flash("error", err.message); return res.redirect("back"); //"Something went wrong while saving!"
      }
      req.flash("success", "The campground was successfully updated."); res.redirect("/campgrounds");
    });
  });
});

//DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, (req, res) => {
  console.log("DELETE /campgrounds/" + req.params.id );
  Campground.findById(req.params.id, function (err, campground) {
    if(err) { console.log(err); req.flash("error", "File not found."); return res.redirect("back"); }
    utility.deleteCampground(campground, (err, campground) => {
      if(err) { console.log(err); req.flash("error", err.message); return res.redirect("back"); }
      console.log("router.delete: Successfully deleted campground", campground.name);
      req.flash("success", "Successfully Deleted!"); res.redirect("/campgrounds");
      const qry = Notification.find({ campgroundId: campground.id });
      qry.exec((err, notifications) => { //console.log("Notifications:", notifications, err);
        for(const notification of notifications) { //console.log("Removing Notification:", notification);
          notification.remove((err, notification) => { //console.log("Removed notification:", notification);
            const agg = User.aggregate([ { $project: { salt: 0, hash: 0 } },
              { $unwind: "$notifications" },
              { $match: { notifications: notification._id } }
            ]);
            agg.exec((err, users) => { //console.log("Notified Users:", users, users.length, err);
              for(const user of users) { //console.log("Notified User:", user);
                User.findById(user._id, (err, user) => { //console.log("Notified User:", user);
                  user.notifications.splice(user.notifications.indexOf(notification.id), 1); user.save();
                  //console.log("Notification removed from user:", user);
                });
            } });
          });
      } });
    });
});});

//================================================//

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//================================================//

module.exports = router;
