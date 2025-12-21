import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imageDir = path.join(__dirname, '../data/image');
const readmePath = path.join(__dirname, '../README.md');

// Get timestamp
const timestamp = Date.now();

// Read directory
const files = fs.readdirSync(imageDir);

// Delete all files except profile.png
files.forEach(file => {
  if (file !== 'profile.png') {
    fs.unlinkSync(path.join(imageDir, file));
  }
});

// Rename profile.png to profile_(timestamp).png
const oldPath = path.join(imageDir, 'profile.png');
const newFilename = `profile_${timestamp}.png`;
const newPath = path.join(imageDir, newFilename);

if (fs.existsSync(oldPath)) {
  fs.renameSync(oldPath, newPath);
  console.log(`Renamed profile.png to ${newFilename}`);

  // Update README
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = readme.replace(/profile(_\d+)?\.png/g, newFilename);
  fs.writeFileSync(readmePath, readme);
  console.log('Updated README.md');
}