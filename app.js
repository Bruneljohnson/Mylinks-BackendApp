const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const ratelimit = require('express-rate-limit');
const mongoSanitise = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const compression = require('compression');
const pug = require('pug');
const path = require('path');
//--------------------------------//
const AppError = require('./utilities/appError');
const globalErrorHandler = require('./controllers/errorController');
const shortUrlController = require('./controllers/urlController');
//--------------------------------//

const shortUrlRouter = require('./routes/urlRoutes');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();
// SET TEMPLATING ENGINE
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARE

// Serving Static Files
app.use(express.static(path.join(__dirname, 'public', 'img', 'users')));

// Implement CORS and security headers in API Request
const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Access-Control-Allow-Origin',
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
  credentials: true,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

//Log requests on development
process.env.NODE_ENV === 'development' && app.use(morgan('dev'));

//Limit the number of requests from one IP Address
const mainApiLimiter = ratelimit({
  max: 100,
  windowMS: 60 * 60 * 1000,
  message: `Too many hits from this IP, The limit of ${this.max} has been hit. Please try again in 90mins.`,
});

app.use('/api', mainApiLimiter);

const freeTestLimiter = ratelimit({
  max: 1,
  windowMS: 60 * 60 * 1000,
  message: `Your free sample has ended. Please Sign up for unlimited access.`,
});

app.use('/api/v1/freeTester', freeTestLimiter);

// Convert JSON Data in req.body that Expess can use in post requests
app.use(express.json({ limit: '15kb' }));

//Sanitization against NoSQL Injection Queries and XSS Attacks
app.use(mongoSanitise());
app.use(xssClean());

//Compress Request/Response Cycle Size
app.use(compression());

app.use(`/`, viewRouter);
app.post('/api/v1/freetester', shortUrlController.createNewUrlShort);
app.use('/api/v1/myurl', shortUrlRouter);
app.use('/api/v1/users', userRouter);
app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this Server`, 404));
});
app.use(globalErrorHandler);

module.exports = app;
