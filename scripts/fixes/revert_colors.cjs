const fs = require('fs');
const path = require('path');

const colorMap = {
  // Main app bg / Button text
  '#fdfbf7': '#f4f7f5', 
  
  // Surfaces
  '#f5f2eb': '#fbfaf7', 
  '#eaf0eb': '#e6f0ea', 
  
  // Accents
  '#7c9082': '#193d2c', 
  '#5a6b5e': '#112a1f', 
  '#122e21': '#112a1f', // Accent hover from index.css
  
  // Borders
  '#e6e1d6': '#e5e0d5', 
  '#d5cfc1': '#d5cebf', 
  
  // Text
  '#2c1e16': '#131715', 
  '#5c4e46': '#59635e', 
  '#8c7e76': '#8b948f', 
  
  // Errors
  '#a74b3e': '#942426', 
  '#f9ebe9': '#fcf3f3', 
  '#e8c9c4': '#f0c2c2', 
  
  // Warnings
  '#c49a45': '#9e743a', 
  '#fbf5e6': '#fffcf5', 
  '#e3d1a5': '#e7d5b8', 
  
  // Other
  '#6b8395': '#2c5282',
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
      content = content.replace(/background: #f4f7f5;/, 'background: #f0ece3;');
      content = content.replace(/background: #e5e0d5;/, 'background: #d4cec2;');
      content = content.replace(/background: #d5cebf;/, 'background: #aba394;');
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
