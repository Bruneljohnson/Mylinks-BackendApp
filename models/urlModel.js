const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');
const User = require('./userModel');

const shortUrlSchema = new mongoose.Schema({
  fullUrl: {
    type: String,
    lowercase: true,
    required: [true, 'Full Url required to make a Short Url'],
  },
  shortUrl: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastVisited: {
    type: Date,
    default: Date.now,
  },

  visits: {
    type: Number,
    default: 0,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
});

//INDEXES

shortUrlSchema.index({ fullUrl: 1, shortUrl: 1 }, { unique: true });
shortUrlSchema.index({ lastVisited: 1 }, { expireAfterSeconds: 3600 }); //604800 * 1000 = 7 days
// STATIC METHODS
shortUrlSchema.statics.calcTotalVisits = async function (userId) {
  try {
    const stats = await this.aggregate([
      {
        $match: { user: userId },
      },
      {
        $group: {
          _id: '$user',
          nRating: { $sum: '$visits' },
        },
      },
    ]);

    await User.findByIdAndUpdate(userId, {
      totalUrlVisits: stats[0]?.nRating ?? 0,
    });
  } catch (err) {
    next(err);
  }
};

// DOCUMENT MIDDLEWARE
shortUrlSchema.pre('save', function (next) {
  if (!this.isModified('shortUrl')) return next();

  const nanoid = customAlphabet('12345abcdef', 7);
  this.shortUrl = nanoid();

  next();
});

shortUrlSchema.post('save', async function () {
  if (this.user) await this.constructor.calcTotalVisits(this.user);
});

//QUERY MIDDLEWARE

shortUrlSchema.pre(/^findOneAnd/, async function (next) {
  try {
    this.calculating = await this.findOne();
    next();
  } catch (err) {
    next(err);
  }
});
shortUrlSchema.post(/^findOneAnd/, async function () {
  await this.calculating.constructor.calcTotalVisits(this.calculating.user);
});
const ShortUrl = mongoose.model('ShortUrl', shortUrlSchema);

module.exports = ShortUrl;
