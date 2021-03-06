# YelpCamp
YelpCamp is a tutorial project written in Node/Express along with Mongoose to access a MongoDb database in the backend. The application is basically designed to maintain campgrounds, outdoor places where people can get away for camping.

## User Features
User features of the application include:
1. <b>Landing page:</b> the root link of the app displays a landing page that animates through a few sample campground pictures. It also contains a link to the campgrounds page.
2. <b>Campgrounds page:</b> it lists all the campgrounds stored in the system along with thumbnails of the pictures. It also provides a search feature, through which a user can filter out the desired campgrounds.
3. <b>Campground details page:</b> this page displays all the details of a particular campground along with a full size picture and its geographical position on the Google map.
4. <b>Sign-up/Sign-in:</b> any visitor can sign-up with the application using a unique email address. The user is marked as an administrator, if he/she can provide a secret code.
5. <b>Add new campground:</b> only signed in users can add a new campground, uploaing its picture into the system. Valid locations are geocoded into latitudes and longitudes, which are later used for displaying in the campground details page.
6. <b>Edit/Delete campground:</b> only the owner, who created a campground, is able to edit or delete the campground. Other users do not even see the edit/delete links. However, admin users can edit/delete any campground of any user.
7. <b>Comments:</b> signed-in users can comment on a campground in the details page. Other users can only view.
8. <b>Edit/Delete comment:</b> a comment can only be edited or deleted by the user who made the comment. Other users do not even see the edit/delete links.
9. <b>User profile:</b> viewers of a campground can see the profile of the user who created it, through a link given in the details page. The profile page also shows a list of all the campgrounds the user has created.
10. <b>Reset password:</b> a user can reset his/her password by manually going to the /forgot link, and providing his/her unique email. The system then sends a link through an email, which opens up a form asking for a new password.
11. <b>Following a user:</b> a signed-in user can follow another user, by clicking on a button in that user's profile page. The follow button will only be available if the user is signed in. The button will read "stop following" if the signed-in user is already following that user.
12. <b>In-app notifications:</b> a user will be notified upon login, when a new campground is created by a user who is followed by the signed-in user. The notifications will be shown in a drop-down on the menu bar of the user. The notification will be removed from the list, once the user views it. The drop-down will also contain a link to all the past notifications.

## Additional Notes
Below is a list of additional functionalities that may accessed/used by a programmer:
1. <b>Seeding:</b> a utility function named seedDb can be used to populate a database with some initial sample campgrounds.
2. <b>Upload to cloud:</b> pictures that are uploaded as campgrounds are saved in a public folder. Additionally, these files may also be uploaded to Cloudinary, Amazon s3 and/or Google cloud storage.
3. <b>Environment variables:</b> database url and api credentials are used in the code as environment variables. A .env.sample file with placeholders is provided as a template, which may be renamed to .env, in order to facilitate setting up the running environment.
