const { Readable } = require('node:stream');
const cloudinary = require('../config/cloudinary');

const uploadProfileImage = (buffer) =>
  new Promise((resolve, reject) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      return reject(new Error('Invalid profile image buffer.'));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'ma-stall/profile-images',
        resource_type: 'image',
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result?.secure_url || !result?.public_id) {
          return reject(new Error('Cloudinary returned an invalid upload result.'));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    Readable.from([buffer]).pipe(stream);
  });

module.exports = uploadProfileImage;
