const fs = require('fs');
const path = require('path');

const colorMap = {
  // Backgrounds & Surfaces
  '#f4f7f5': '#0f1115', // Main app background
  '#ffffff': '#16191f', // White surfaces / Cards
  '#fbfaf7': '#1a1d24', // Off-white surfaces / Tables
  '#e6f0ea': '#1e222b', // Light green surfaces (accent backgrounds)
  
  // Primary Accents (Dark Green -> Electric Lime)
  '#193d2c': '#b2ff05', // Primary brand color
  '#112a1f': '#9dff00', // Hover state for primary
  '#a3d8be': '#272a33', // Lighter green (toast bg)
  '#c1dec6': '#272a33', // Light green border
  
  // Text Colors
  '#131715': '#ffffff', // Primary heading text
  '#59635e': '#a1a1aa', // Secondary text
  '#8b948f': '#71717a', // Muted text
  '#f7f9f7': '#0f1115', // Text inside primary buttons
  
  // Borders
  '#e5e0d5': '#272a33', // Default borders
  '#d5cebf': '#333842', // Slightly darker borders

  // Destructive / Error
  '#942426': '#ff3366', // Error red
  '#fcf3f3': '#2a161a', // Error light bg
  '#f0c2c2': '#4a1b24', // Error light border
  '#7e1c1f': '#ff3366', // Error dark border
  
  // Warning / Yellows
  '#9e743a': '#ffcc00', 
  '#fffcf5': '#2a2411',
  '#e7d5b8': '#665211',
  '#d4a017': '#ffcc00',
  '#8a680e': '#ffcc00',
  '#996515': '#ffcc00',
  
  // Other specific
  '#2c5282': '#33ccff', // Blue
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [oldColor, newColor] of Object.entries(colorMap)) {
      const regex = new RegExp(oldColor, 'gi');
      content = content.replace(regex, newColor);
    }
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
