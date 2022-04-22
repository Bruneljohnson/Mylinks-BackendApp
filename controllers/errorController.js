const AppError = require('../utilities/appError');

const castErrorDBHandler = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const duplicateErrorDBHandler = (err) => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
  const message = `Duplicate field value:  ${value[0]}, please use another value.`;
  return new AppError(message, 400);
};

const validationErrorDBHandler = (err) => {
  const errors = Object.values(err.errors).map((error) => error.message);
  const message = `Invalid input value:  ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const JWTErrorHandler = () =>
  new AppError('Invalid Token, Please log in again.', 401);

const JWTExpiredHandler = () =>
  new AppError('Your Token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong.',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode ?? 500;
  err.status = err.status ?? 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = castErrorDBHandler(error);
    if (error.code === 11000) error = duplicateErrorDBHandler(error);
    if (error.name === 'ValidationError')
      error = validationErrorDBHandler(error);
    if (error.name === 'JsonWebTokenError') error = JWTErrorHandler();
    if (error.name === 'TokenExpiredError') error = JWTExpiredHandler();

    sendErrorProd(error, res);
  }
};
