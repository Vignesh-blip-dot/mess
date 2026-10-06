const fs = require('fs');
const path = require('path');

const colorMap = {
  // Backgrounds & Surfaces
  '#0f1115': '#fdfbf7', // Main app background (Warm Cream)
  '#16191f': '#ffffff', // Cards (White)
  '#1a1d24': '#f5f2eb', // Tables/Subtle (Light Beige)
  '#1e222b': '#eaf0eb', // Accent background (Light Sage)
  
  // Primary Accents (Electric Lime -> Sage)
  '#b2ff05': '#7c9082', // Primary Sage Green
  '#9dff00': '#5a6b5e', // Hover Sage
  
  // Borders
  '#272a33': '#e6e1d6', // Default borders (Muted Beige)
  '#333842': '#d5cfc1', // Darker borders
  
  // Text Colors (White/Gray -> Espresso)
  '#ffffff': '#2c1e16', // Primary heading (Espresso)
  '#a1a1aa': '#5c4e46', // Secondary text
  '#71717a': '#8c7e76', // Muted text
  '#858f89': '#8c7e76', // Muted text from index.css
  
  // Destructive / Error (Neon Red -> Terracotta)
  '#ff3366': '#a74b3e', // Error red
  '#2a161a': '#f9ebe9', // Error light bg
  '#4a1b24': '#e8c9c4', // Error light border
  
  // Warning / Yellows
  '#ffcc00': '#c49a45', // Warm Gold
  '#2a2411': '#fbf5e6', // Light Gold bg
  '#665211': '#e3d1a5', // Gold border
  
  // Other specific
  '#33ccff': '#6b8395', // Muted slate blue
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
    
    // Replace text inside primary buttons so it's readable against Sage background
    // Since previous was '#0f1115' (used as primary button text inside electric lime), 
    // now we want it to be white inside the Sage button.
    // Wait, earlier '#0f1115' became '#fdfbf7'. That is cream!
    // Cream text on Sage background (#fdfbf7 on #7c9082) works perfectly!
    // No special rule needed for that, as long as it gets translated to cream.

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
