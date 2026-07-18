const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const Customer = require('../models/customer.model');
const MembershipTier = require('../models/membershipTier.model');

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await Customer.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Helper function to find or create customer
const getOrCreateCustomer = async (filter, profileData) => {
  let customer = await Customer.findOne(filter);
  
  if (!customer) {
    // If not found by social ID, check if email already exists
    if (profileData.email) {
      customer = await Customer.findOne({ email: profileData.email });
    }

    if (customer) {
      // Link social ID to existing account
      if (profileData.googleId) customer.googleId = profileData.googleId;
      if (profileData.facebookId) customer.facebookId = profileData.facebookId;
      if (!customer.avatar && profileData.avatar) customer.avatar = profileData.avatar;
      customer.isVerified = true;
      await customer.save();
    } else {
      // Create new customer
      let defaultTierId = null;
      const lowestTier = await MembershipTier.findOne({ status: 'active' })
        .sort({ minPoints: 1 })
        .lean();
      if (lowestTier) {
        defaultTierId = lowestTier._id;
      }

      customer = await Customer.create({
        fullName: profileData.fullName,
        email: profileData.email,
        googleId: profileData.googleId,
        facebookId: profileData.facebookId,
        avatar: profileData.avatar,
        tierId: defaultTierId,
        isActive: true,
        isVerified: true, // Social accounts are auto-verified
      });
    }
  }
  return customer;
};

// Configure Google Strategy
const backendUrl = process.env.SERVER_URL;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${backendUrl}/api/v1/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
        const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : '';
        
        const profileData = {
          fullName: profile.displayName,
          email,
          avatar,
          googleId: profile.id,
        };

        const customer = await getOrCreateCustomer({ googleId: profile.id }, profileData);
        return done(null, customer);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Configure Facebook Strategy

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: `${backendUrl}/api/v1/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
        const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

        const profileData = {
          fullName: profile.displayName,
          email,
          avatar,
          facebookId: profile.id,
        };

        const customer = await getOrCreateCustomer({ facebookId: profile.id }, profileData);
        return done(null, customer);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
