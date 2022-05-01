const User = require('../models/userModel');
const AppError = require('../utilities/appError');
const sendEmail = require('../utilities/email');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');

//REFACTORING TOKEN

const signToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRESIN,
  });
};

const sendToken = (res, user, statusCode) => {
  const token = signToken(user);

  user.password = undefined;
  user.activeUser = undefined;
  user.__v = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: statusCode === 201 ? user : user._id,
  });
};

// AUTHENTICATION HANDLERS

exports.signup = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      passwordChangedAt: req.body.passwordChangedAt,
    });

    sendToken(res, newUser, 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return next(new AppError('Please provide your email and password', 400));

    const existingUser = await User.findOne({ email }).select('+password +_id');
    if (
      !existingUser ||
      !(await existingUser.comparePassword(password, existingUser.password))
    )
      return next(new AppError('Incorrect email or password', 401));

    sendToken(res, existingUser, 200);
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const userLookup = await User.findOne({ email }).select('+name');
    if (!userLookup) return next(new AppError("User doesn't exist.", 404));

    const resetToken = userLookup.createResetToken();
    await userLookup.save({ validateBeforeSave: false });

    const userName = userLookup.name.split(' ')[0];

    try {
      await sendEmail({
        email,
        name: userName,
        resetToken: resetToken,
      });
    } catch (err) {
      userLookup.passwordResetToken = undefined;
      userLookup.passwordResetExpiresIn = undefined;
      await userLookup.save({ validateBeforeSave: false });
      return next(
        new AppError('Error Sending Email, Please try again later', 500)
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Your Password Reset Token was sent to your email.',
    });
  } catch (err) {
    next(err);
  }
};
exports.resetPassword = async (req, res, next) => {
  try {
    const { password, passwordConfirm } = req.body;
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const currentUser = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiresIn: { $gt: Date.now() },
    });

    if (!currentUser)
      return next(new AppError('Token is invalid or has expired', 401));

    currentUser.password = password;
    currentUser.passwordConfirm = passwordConfirm;
    currentUser.passwordResetToken = undefined;
    currentUser.passwordResetExpiresIn = undefined;
    await currentUser.save();

    sendToken(res, currentUser, 200);
  } catch (err) {
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { password, passwordConfirm, passwordCurrent } = req.body;
    if (!passwordCurrent || !password || !passwordConfirm)
      return next(new AppError('Please enter your password,', 400));

    const currentUser = await User.findById(req.user.id).select('+password');

    console.log(currentUser);

    if (
      !(await currentUser.comparePassword(
        passwordCurrent,
        currentUser.password
      ))
    )
      return next(new AppError('Invalid password.', 401));

    currentUser.password = password;
    currentUser.passwordConfirm = passwordConfirm;
    await currentUser.save();

    sendToken(res, currentUser, 200);
  } catch (err) {
    next(err);
  }
};

exports.deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { activeUser: false },
      { new: true, runValidators: true }
    );

    res.send(204).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

//AUTHORISATION

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    )
      token = req.headers.authorization.split(' ')[1];

    if (!token) return next(new AppError("You're not logged in!", 401));

    const decodedToken = await promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET
    );

    const currentUser = await User.findById(decodedToken.id);
    if (!currentUser)
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );

    if (currentUser.passwordChangedAfter(decodedToken.iat))
      return next(
        new AppError('Password was recently updated. Please log in again.', 401)
      );

    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );

    next();
  };
};
