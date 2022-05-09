const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');
const util = require('util');

//----------S3 INSTANCE-------------//
const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

//----------UPLOAD FILE TO S3-------------//
exports.uploadFile = (file, path) => {
  //reads the file from the path stated
  const fileStream = fs.createReadStream(path);

  //Object we can upload from the stream
  const uploadStream = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename,
  };

  //use S3 Methods to upload to bucket and return a promise.
  return s3.upload(uploadStream).promise();
};

//----------DOWNLOAD FILE FROM S3-------------//
exports.getFileStream = (key) => {
  //Object we can download image using key
  const downloadParams = {
    Bucket: bucketName,
    Key: key,
  };

  //use S3 Methods to upload to bucket and return a promise.
  return s3.getObject(downloadParams).createReadStream();
};

//----------CLEAR IMAGE FROM EXPRESS SERVER-------------//
//insert the path specified in Sharp.
exports.unloadFromServer = util.promisify(fs.unlink);
