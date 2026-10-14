const fs = require('fs');
const path = require('path');

// My previous script replaced:
// #16191f -> #ffffff
// Then #ffffff -> #2c1e16
// 
// So anywhere #16191f was supposed to be #ffffff, it is now #2c1e16.
// Wait, the original #ffffff was ALSO replaced to #2c1e16.
// How do we distinguish them?
// Actually, this was supposed to be a Light theme. So the backgrounds that were supposed to be white are now espresso!
// Let's use `git checkout` to restore the code before the Espresso script, then run a safer replace!
// But we don't have git!
// Let's create a reverse mapping of Obsidian & Electric Lime from the original code!
