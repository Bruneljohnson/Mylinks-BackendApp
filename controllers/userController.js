const User = require('../models/userModel');
const AppError = require('../utilities/appError');
const multer = require('multer');
const sharp = require('sharp');
const {
  uploadFile,
  getFileStream,
  unloadFromServer,
} = require('../utilities/s3');

//Image Upload
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload an image, (jpg,png)', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadPhoto = upload.single('photo');

exports.resizeImg = async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 75 })
    .toFile(`public/img/users/${req.file.filename}`);

  await uploadFile(req.file, `public/img/users/${req.file.filename}`);
  await unloadFromServer(`public/img/users/${req.file.filename}`);
  next();
};

//----------GET POST IMAGES FROM S3------------//
exports.getUserProfilePhoto = async (req, res, next) => {
  try {
    const key = req.params.key;
    console.log(key);
    const readStream = getFileStream(key);

    readStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

//Prevent Malicious Attacks
const filterObj = (obj, ...allowedfields) => {
  const newObj = {};
  allowedfields.forEach((field) => {
    if (allowedfields.includes(field)) newObj[field] = obj[field];
  });

  return newObj;
};

exports.updateMe = async (req, res, next) => {
  try {
    if (req.body.password || req.body.passwordConfirm)
      return next(
        new AppError(
          'This is not the Route for updating passwords, please use /updatePassword.',
          400
        )
      );
    const filteredBody = filterObj(req.body, 'name', 'email');
    if (req.file) filteredBody.photo = req.file.filename;

    const currentUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: "You've successfully updated your details.",
      data: {
        user: currentUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.aboutMe = async (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { activeUser: false },
      { new: true, runValidators: true }
    );
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

//ADMIN ROUTES

exports.getOneUser = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.params.id).populate({
      path: 'mylinks',
      select: '-__v ',
    });
    // shorthand for Tour.findOne({_id: req.params.id})

    if (!currentUser) {
      return next(new AppError(`No user found with that ID`, 404));
    }

    currentUser.__v = undefined;

    res.status(200).json({
      status: 'success',
      data: {
        data: currentUser,
      },
    });
  } catch (err) {
    next(err);
  }
};
