const ShortUrl = require('../models/urlModel');
const APIFeatures = require('../utilities/apiFeatures');
const AppError = require('../utilities/appError');

exports.setUserId = (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

// TOP 5 VISITED LINKS
exports.top5visited = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-visits';

  next();
};

// GET ALL
exports.getAllUrlShorts = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user && req.user.role !== 'admin') {
      filter = { user: req.user.id };
    }
    const ApiFeatures = new APIFeatures(ShortUrl.find(filter), req.query)
      .filter()
      .sort()
      .fields()
      .pagination();
    const shortenedUrls = await ApiFeatures.query;
    res.status(200).json({
      status: 'success',
      results: shortenedUrls.length,
      data: shortenedUrls,
    });
  } catch (err) {
    next(err);
  }
};

//CREATE
exports.createNewUrlShort = async (req, res, next) => {
  try {
    const newUrl = await ShortUrl.create({
      fullUrl: req.body.fullUrl,
      shortUrl: req.body.shortUrl,
      user: req.body.user,
    });

    newUrl.__v = undefined;
    res.status(201).json({ status: 'success', data: newUrl });
  } catch (err) {
    next(err);
  }
};

//GET ONE
exports.getSingleShortUrl = async (req, res, next) => {
  try {
    const shortenedUrl = await ShortUrl.findOne({
      shortUrl: req.params.myurl,
    });

    if (!shortenedUrl)
      return next(new AppError(`No url found with that reference.`, 404));

    shortenedUrl.visits++;
    shortenedUrl.lastVisited = Date.now();
    shortenedUrl.save({ validateBeforeSave: false });

    res.redirect(shortenedUrl.fullUrl);
  } catch (err) {
    next(err);
  }
};

// DELETE ONE
exports.deleteShortUrl = async (req, res, next) => {
  try {
    const shortenedUrl = await ShortUrl.findOneAndDelete({
      shortUrl: req.params.shortUrl,
    });
    if (!shortenedUrl)
      return next(new AppError(`No url found with that reference.`, 404));

    res.status(204).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

//Admin Functions
