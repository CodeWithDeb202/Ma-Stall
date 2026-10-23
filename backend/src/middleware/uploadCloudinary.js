const { Readable } = require('node:stream');
const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        if (!file || !Buffer.isBuffer(file.buffer)) {
            return reject(new Error('Invalid image file buffer.'));
        }

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'ma-stall/menu-items',
                resource_type: 'image',
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', {
                        message: error.message,
                        http_code: error.http_code,
                        name: error.name,
                        error: error.error,
                        requestId: error.request_id,
                        response: error.response,
                    });
                    return reject(error);
                }

                if (!result?.secure_url || !result?.public_id) {
                    return reject(new Error('Cloudinary returned an invalid upload result.'));
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        Readable.from([file.buffer]).pipe(stream);
    });
};

module.exports = uploadToCloudinary;
