const Campground = require("../models/campground"), Comment = require("../models/comment"),
      cloudinary = require("cloudinary").v2, geocoder = require("node-geocoder")({ // httpAdapter: "https",
        provider: "google", apiKey: process.env.GEOCODER_API_KEY, formatter: null
      }), fs = require("fs"), {Storage} = require("@google-cloud/storage"), gcstorage = new Storage({ 
        projectId: process.env.GCS_PROJECT_ID, credentials: JSON.parse(process.env.GCS_CREDENTIALS)
      }),
      s3 = new (require("aws-sdk/clients/s3"))({apiVersion: '2006-03-01', region: process.env.AWS_REGION}),
      User = require("../models/user"), Notification = require("../models/notification");

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, secure: true,
  api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("Testing GCS credentials"); // testing GCS credentials
gcstorage.getBuckets((err,buckets) => console.log("utility.index: GCS buckets -",buckets.length,", Error -",err));

// all utility functions go here
const utilityObj = {};

//================================================//

utilityObj.deleteCampground = async function(campground, callback) {
  if(campground.comments.length) {
    while(comment = campground.comments.pop()) { //console.log("utility.deleteCampground: Deleting comment", comment);
      Comment.findByIdAndDelete(comment, (err, comment) => { if(err) return console.log("utility.deleteCampground: Error", err);
        if(comment) console.log("utility.deleteCampground: Deleted comment '"+comment.text+"' by "+comment.author.username);
      });
  } }
  if(campground.image) { fs.unlink("./public" + campground.image, (err) => { if (err) console.log(
    "failed to delete local image:", err); else console.log('successfully deleted local image:', campground.image);
  }); } utilityObj.deleteFromCloud(campground);
  /*campground.remove((err, campground) => { if(err) console.log("utility: Error", err);
    else console.log("utility: Campground has been successfully deleted");
  });*/
  if(typeof callback === "function") campground.remove( callback );
  else { console.log("utility: Removing campground", campground.name);
    try { await campground.remove(); } catch(err) { console.log("utility: Error", err); }
    console.log("utility: Campground", campground.name, "has been successfully removed");
  }
};

//Utility function for deleting campground images from cloud
utilityObj.deleteFromCloud = function(campground) {
  if(campground.s3Image) { const bucket = campground.s3Image.split("/")[2].split(".")[0]; //console.log("s3Bucket:", bucket);
    s3.deleteObject({Bucket: bucket, Key: campground.s3Id}, (err, data) => { console.log("S3:", data, err); });
  }
  if(campground.cloudinaryId) {
    cloudinary.uploader.destroy(campground.cloudinaryId, (err, result) => { console.log("Cloudinary:", result, err); });
  }
  if(campground.gcsImage) { const bucket = campground.gcsImage.split("/")[3]; //console.log("gcsBucket:", bucket);
    gcstorage.bucket(bucket).file(campground.gcsId).delete((err, apiResp) => { console.log("GCS:", err); }); //, apiResp
  }
};

//================================================//

//Local function to support saving campgrounds
const saveCampgroundToDisk = function(req, image, uploadedTo = "", imageId, callback) {
  const campground = req.body.campground; console.log("utility.saveCampgroundToDisk:", image, uploadedTo);
  if(imageId) campground[uploadedTo.toLowerCase() + "Id"] = imageId;
  if(image) campground[uploadedTo.toLowerCase() + "Image"] = image;
  if(campground._id) { //console.log("Update Campground with:", campground);
    campground.save((err, campground) => { if(err) console.log(err); else {
      req.body.campground = campground; console.log("utility.saveCampgroundToDisk: UPDATED", uploadedTo, campground); }
      if(typeof callback === "function") return callback(err, campground);
    });
  } else { console.log("Create Campground:", campground.name);
    if(req.user) campground.author = { id: req.user._id, username: req.user.username };
    Campground.create(campground, async function(err, campground) { if(err) console.log(err); else {
      if(req.user) { try { console.log("utility.saveCampgroundToDisk: Populating followers...");
        const user = await User.findById(req.user._id).populate("followers").exec(),
        newNotification = { username: user.username, campgroundId: campground.id };
        console.log("User:", user, ", newNotification:", newNotification);
        for(const follower of user.followers) { console.log("follower:", follower);
          const notification = await Notification.create(newNotification); console.log("notification:", notification);
          if(!follower.email) follower.email = follower.username.toLowerCase().replace(/\s/g, "") + "@yelpcamp.com";
          follower.notifications.push(notification.id); follower.save(); console.log("Saved follower:", follower);
        } } catch(err) { console.log("utility.saveCampgroundToDisk:", err); }
      }
      req.body.campground = campground; console.log("utility.saveCampgroundToDisk: NEW CAMPGROUND", campground); }
      if(typeof callback === "function") return callback(err, campground);
  }); }
};

//Utility function for saving campgrounds
utilityObj.saveCampground = async function(req, image, uploadedTo = "", imageId, callback) {
  if(arguments.length < 5) {
    if(typeof imageId === "function") { callback = imageId; imageId = undefined; }
    else if(typeof uploadedTo === "function") { callback = uploadedTo; uploadedTo = ""; }
    else if(typeof image === "function") { callback = image; image = undefined; }
  }
  const campground = req.body.campground; console.log("utility.saveCampground:", image, uploadedTo);
  if(!req.body.location) { campground.lat = undefined; campground.lng = undefined; }
  else if(campground._id? campground.location !== req.body.location: true) { //geocode the location
    try { console.log("utility: Geocoding Location", req.body.location);
      const data = await geocoder.geocode(req.body.location);
      if(!data.length) { const err = {message: "Invalid address"}; console.log("utility: Geocode", err);
        if(typeof callback === "function") { callback(err, campground); callback = undefined; }
      } else { console.log("utility: Location geocoded", data);
        campground.location = data[0].formattedAddress;
        campground.lat = data[0].latitude; campground.lng = data[0].longitude;
    } } catch(err) { console.log("utility: Geocode Error", err);
      if(typeof callback === "function") { callback(err, campground); callback = undefined; }
  } } req.body.campground = campground;
  saveCampgroundToDisk(req, image, uploadedTo, imageId, callback);
  if(req.file) upload2Cloud(req);
};

//================================================//

//Utility function for uploading campground images to cloud
const upload2Cloud = function(req) {
  s3.listBuckets(function(err, data) { if (err) console.log("Error", err); else { //console.log(data.Buckets);
    const bucketName="apps-mahbub-"+process.env.AWS_REGION_SUFFIX, bucket=data.Buckets.find(bucket=>bucket.Name===bucketName);
    if (!bucket) { s3.createBucket({Bucket: bucketName}, function(err, data) {
      if (err) console.log("Error", err); else console.log("Success", data);
    }); }
    s3.listObjects({Bucket: bucketName, Delimiter: "."}, function(err, data) { if(err) console.log(err); else {
      const folderName="YelpCamp/", folder=data.Contents.find(folder=>folder.Key===folderName); //console.log(data.Contents);
      if (!folder) { s3.putObject({Bucket: bucketName, Key: folderName}, (err, obj) => {
        if(err) console.log("Error", err); else console.log("Success", obj);
      }); }
      const fileContent = fs.readFileSync(req.file.path); //console.log("fileContent", (typeof fileContent), fileContent);
      s3.upload({ Bucket: bucketName, ContentType: req.file.mimetype, ACL: "public-read",
        Key: folderName + req.file.filename, Body: fileContent }, (err, obj) => { console.log("S3", obj, err); //, req.body
        if(obj) saveCampgroundToDisk(req, obj.Location, "S3", obj.Key);
      });
    } });
  } });

  cloudinary.uploader.upload(req.file.path, { folder: "Apps/YelpCamp",
    public_id: req.file.filename.slice(0,-4) }, (err, result) => {
    if(err) console.log("utility.upload2Cloud: Cloudinary", err); //console.log("Cloudinary", result);
    else if(result) saveCampgroundToDisk(req, result.secure_url, "Cloudinary", result.public_id);
  }); //cloudinary.uploader.upload

  const gcsUpload = function(bucket, folder) { const file = bucket.file(folder + req.file.filename);
    fs.createReadStream(req.file.path).pipe(file.createWriteStream({resumable: false, contentType: req.file.mimetype}))
    .on('error', err => { console.log("utility.upload2Cloud: GCS Error", err); }).on('finish', () => {
      const publicUrl = "https://storage.googleapis.com/"+bucket.name+"/"+file.name;
      console.log("utility.upload2Cloud: Uploaded to GCS", file.name, "'" + publicUrl + "'"); //console.log(file);
      saveCampgroundToDisk(req, publicUrl, "GCS", file.name);
    }); //.end(req.file.buffer);
  };
  gcstorage.getBuckets(function(err, buckets) {
    if (err) console.log("Error", err); else { //console.log("Success", buckets);
      const bucketName="apps-mahbub", bucket=buckets.find(bucket=>bucket.name===bucketName), folder="yelpcamp/";
      if(bucket) { //console.log("Bucket Found:", bucket.name); //, bucket.metadata
        bucket.getFiles({prefix: folder}, (err, files) => { if (err) console.log("Error", err); else { //console.log("Files", files);
          if(files.length < 1) bucket.file(folder).save(); gcsUpload(bucket, folder);
        } });
      } else { console.log("Not found, creating...");
        gcstorage.createBucket(bucketName, {location: process.env.GCS_LOCATION, regional: true}, (err, bucket) => {
          if(err) console.log("Error", err); else { bucket.makePublic((err) => { if(err) console.log("Error", err); else {
            bucket.iam.getPolicy().then(policy => { console.log("Policy Bindings", policy[0].bindings);
              policy[0].bindings.push({role: "roles/storage.objectViewer", members: ["allUsers"]});
              console.log("Updated Bindings", policy[0].bindings);
              bucket.iam.setPolicy(policy[0]).then(policy => console.log("Updated Policy:", policy[0]))
              .catch(err => console.log("Error::", err));
              bucket.setMetadata({ iamConfiguration: {uniformBucketLevelAccess: {enabled: true}} }, (err, metadata) => {
                if(err) console.log(err); else { console.log("Created Bucket:", bucket.name); gcsUpload(bucket, folder); }
              });
            });
        }});}});
  } } });
};

//================================================//

module.exports = utilityObj;
