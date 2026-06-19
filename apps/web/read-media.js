const fs = require('fs');
const path = require('path');

const filePath = 'C:/Users/user/.gemini/antigravity-ide/brain/d3d5e474-a499-43a8-93f1-284e990a6de2/uploaded_media_1781883815866.img';

try {
    const buffer = fs.readFileSync(filePath);
    console.log('File size:', buffer.length);
    console.log('Header (Hex):', buffer.slice(0, 32).toString('hex'));
    console.log('Header (UTF-8):', buffer.slice(0, 100).toString('utf8').replace(/[^\x20-\x7E]/g, '.'));
} catch (err) {
    console.error('Error reading file:', err);
}
