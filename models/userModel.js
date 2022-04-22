const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name.'],
      minlength: [3, 'Names must be longer than three characters.'],
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email.'],
      lowercase: true,
      unique: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email.'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    photo: {
      type: String,
      default: 'default.jpg',
    },

    password: {
      type: String,
      select: false,
      minlength: [8, 'Password must be eight characters or more.'],
      required: [true, 'Please provide a password (min 8 chars long).'],
    },

    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your stated password.'],
      validate: {
        validator: function (val) {
          return val === this.password;
        },
        message: "Passwords don't match!",
      },
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpiresIn: {
      type: Date,
    },
    activeUser: { type: Boolean, default: true, select: false },
    totalUrlVisits: { type: Number, default: 0 },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
//VIRTUALLY POPULATE
userSchema.virtual('mylinks', {
  ref: 'ShortUrl',
  foreignField: 'user',
  localField: '_id',
});

//DOCUMENT MIDDLEWARE
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', async function (next) {
  if (this.isNew || !this.isModified('password')) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//QUERY MIDDLEWARE
userSchema.pre(/^find/, async function (next) {
  this.find({ activeUser: { $ne: false } });
  next();
});

//INSTANCE METHODS
userSchema.methods.comparePassword = async function (password, userPassword) {
  return await bcrypt.compare(password, userPassword);
};

userSchema.methods.passwordChangedAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Number.parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return jwtTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpiresIn = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
