const path = require('path');

// File processing service
const processFile = async (file) => {
    try {
        const { originalname, filename, size, path: filePath } = file;

        // Example validation: Ensure file size is less than 10 MB
        if (size > 10 * 1024 * 1024) {
            throw new Error('File size exceeds the allowed limit of 10 MB');
        }

        // Return processed file information
        return {
            originalName: originalname,
            fileName: filename,
            filePath: filePath,
            size: size,
            extension: path.extname(originalname),
        };
    } catch (error) {
        console.error('Error processing file:', error.message);
        throw error;
    }
};

module.exports = {
    processFile,
};
