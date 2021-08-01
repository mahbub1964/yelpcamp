const mongoose = require("mongoose"), utility = require("./utility"),
      Comment = require("./models/comment"), fs = require("fs"),
      Campground = require("./models/campground"), User = require("./models/user");

const seeds = [ //data
  {name:"Salmon Creek", image:"SalmonCreek.jpg", price: 9.85, location:"Salmon Creek, CA", description:"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", comments: []},
  {name:"Granite Hill", image:"GraniteHill.jpg", price: 10.25, location:"Granite Hill", description:"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", comments: []},
  {name:"Mountain Goat's Rest", image:"MountainGoatsRest.jpg", price: 9, location:"Mountain Goat's Rest", description:"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", comments: []},
];

async function seedDB() {
  //await Comment.remove({}); console.log("Comments removed");
  //await Campground.remove({});
  const campgrounds = await Campground.find({}); console.log("seedDB: Campgrounds", campgrounds, campgrounds.length);
  for(let i = campgrounds.length-1; i >= 0; i--) { const campground = campgrounds[i];
    console.log("seedDB: Campground", campground.name, "- Comments:", campground.comments);
    console.log("seedDB: Deleting campground", i+1, campground.name);
    //utility.deleteCampground(campground);
    console.log("seedDB: Campground", campground.name, "has not been deleted");
    break;
  }
  console.log("seedDB: The last Campground has not been removed");
  let user = await User.findOne({ email: "system@yelpcamp.com" }); //console.log("seedDB: User", user);
  if(!user) { user = await User.create({ username: "System", email: "system@yelpcamp.com" }); }
  for(const seed of seeds) { console.log("seedDB: Seed -", seed.name, ", Image - ", seed.image, seed);
    const fileName = Date.now() + "_" + seed.image;
    //fs.createReadStream("./public/seeds/" + seed.image).pipe(fs.createWriteStream("./public/images/" + fileName));
    seed.image = "/images/" + fileName;
    let req = { body: { campground: seed, location: seed.location }
      , file: { filename: fileName, path: "./public/images/" + fileName }, user: user
    }; console.log("seedDB: req - ", req);
    /*utility.saveCampground(req, (err, campground) => { if(campground) {
      Comment.create({ text: "This place is great, but I wish there were internet!", author:
        {id: user.id, username: "Homer"} }, (err, comment) => { console.log("seedDB: Comment created", err, comment);
        if(comment) { campground.comments.push(comment._id);
          campground.save(); console.log("seedDB: Comment added to campground", campground);
    }});}});*/
    break;
  }
}

module.exports = seedDB;
