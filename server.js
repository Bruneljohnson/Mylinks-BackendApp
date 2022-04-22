const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION');
  process.exit(1);
});

const app = require('./app');

const DB = process.env.MONGOOSE_DB.replace(
  '<password>',
  process.env.MONGOOSE_PASSWORD
);

const launchMongoose = async () => {
  try {
    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });

    console.log(`DB Connection Successful.`);
  } catch (err) {
    console.log(`DB Connection Was Unsuccessful. ${err.message} `);
  }
};
launchMongoose();

const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`Server running on PORT:${port}, at HOST: ${host}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  server.close(() => process.exit(1));
});

// FOR HEROKU 24HOUR SHUTDOWN
process.on('SIGTERM', () => {
  console.log('SIGTERM RECIEVED. Shutting down now.');
  server.close(() => console.log('PROCESS TERMINATED!'));
});
