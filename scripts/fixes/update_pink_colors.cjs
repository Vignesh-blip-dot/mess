const fs = require('fs');
const path = require('path');

const colorMap = {
  // Main app bg / Button text
  '#f4f7f5': '#fdfafb', 
  '#f7f9f7': '#ffffff',
  
  // Surfaces
  '#fbfaf7': '#ffffff', 
  '#e6f0ea': '#fae6eb', 
  
  // Accents
  '#193d2c': '#ad425e', 
  '#112a1f': '#8f334a', 
  '#a3d8be': '#f0c7d3', 
  '#c1dec6': '#f0c7d3', 
  
  // Borders
  '#e5e0d5': '#f0e6e8', 
  '#d5cebf': '#e6d3d6', 
  
  // Text
  '#131715': '#382b2e', 
  '#59635e': '#7a676b', 
  '#8b948f': '#9c888d', 
  
  // Errors
  '#942426': '#c93444', 
  '#fcf3f3': '#fff0f1', 
  '#f0c2c2': '#fac3c7', 
  '#7e1c1f': '#a32431', 
  
  // Warnings
  '#9e743a': '#b58a5c', 
  '#fffcf5': '#fdfbf7', 
  '#e7d5b8': '#ebd8c7', 
  '#d4a017': '#c79836',
  '#8a680e': '#9c7324',
  '#996515': '#ad7e28',
  
  // Other
  '#2c5282': '#4a678c',
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
    
    // special scrollbar fixes for index.css
    if (filePath.includes('index.css')) {
      content = content.replace(/background: #f0ece3;/g, 'background: #fcf7f8;');
      content = content.replace(/background: #d4cec2;/g, 'background: #ebd8dc;');
      content = content.replace(/background: #aba394;/g, 'background: #c9b4b8;');
      content = content.replace(/background: #131715 !important;/g, 'background: #ffffff !important;');
      content = content.replace(/color: #131715 !important;/g, 'color: #382b2e !important;');
      content = content.replace(/rgba\(25, 61, 44, 0.05\)/g, 'rgba(173, 66, 94, 0.05)');
      content = content.replace(/rgba\(25, 61, 44, 0.12\)/g, 'rgba(173, 66, 94, 0.12)');
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
