// server.js
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import User from './models/User.js';

const app = express();
const port = process.env.PORT || 3000;

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.use('/styles', express.static('styles'));
app.use('/scripts', express.static('scripts'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Use sessions to keep track of user authentication status
app.use(session({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Set up Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://attendify-pro.onrender.com/auth/google/callback',
},
    async (accessToken, refreshToken, profile, done) => {
        // Generate a secret key using crypto
        const secretKey = crypto.randomBytes(32).toString('hex');

        // Save the user's information and tokens to the database
        try {
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // Check if the user already has a role, if yes, don't update the profile
                if (!user.role) {
                    // Update user data if the user already exists and doesn't have a role
                    user.displayName = profile.displayName;
                    user.email = profile.emails[0].value;
                    user.secretKey = secretKey;
                    user.profilePic = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
                    user.accessToken = accessToken;
                    user.refreshToken = refreshToken;
                    await user.save();
                }
            } else {
                // Create a new user if not exists
                user = await User.create({
                    googleId: profile.id,
                    displayName: profile.displayName,
                    email: profile.emails[0].value,
                    secretKey,
                    profilePic: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                    accessToken,
                    refreshToken,
                });
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));

// Serialize and deserialize user information to/from the session
passport.serializeUser((user, done) => done(null, user.id)); // Use user.id (assuming it exists) or user._id
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

app.post('/save-profile', async (req, res) => {
    try {
        const user = req.user;

        // Update user data based on the role
        user.displayName = req.body.displayName;
        user.email = req.body.email;
        user.phone = req.body.phone;
        user.role = req.body.role;

        if (req.body.role === 'Integrated Master Student') {
            // Update additional fields for Integrated Master Student
            user.rollNo = req.body.rollNo;
            user.registrationNo = req.body.registrationNo;
        } else {
            // Clear additional fields for Professor
            user.rollNo = null;
            user.registrationNo = null;
        }

        // Save the updated user data
        await user.save();

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Google OAuth login route
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

// Google OAuth callback route
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    async (req, res) => {
        try {
            const user = req.user;

            if (!user.role) {
                res.redirect('/profile');
            } else {
                res.redirect('/');
            }
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }
);

// Logout route
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

// Define your routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Attendify Pro', user: req.user });
});

app.get('/profile', (req, res) => {
    res.render('profile', { title: req.user.displayName, user: req.user });
});

app.listen(port, () => {
    console.log(`Attendify Pro app listening on port ${port}`);
});
