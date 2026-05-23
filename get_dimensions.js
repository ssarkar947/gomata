const fs = require('fs');

const filePath = 'C:\\Users\\pc\\.gemini\\antigravity\\scratch\\gomata-ghee\\assets\\product_label.jpg';

try {
  const buffer = fs.readFileSync(filePath);
  
  // Read JPEG dimensions
  // JPEG markers start with 0xFF
  let i = 0;
  if (buffer[i] === 0xFF && buffer[i+1] === 0xD8) {
    i += 2;
    while (i < buffer.length) {
      if (buffer[i] === 0xFF) {
        const marker = buffer[i+1];
        if (marker === 0xC0 || marker === 0xC2) { // SOF0 or SOF2
          const height = buffer[i+5] * 256 + buffer[i+6];
          const width = buffer[i+7] * 256 + buffer[i+8];
          console.log(`JPEG Dimensions: ${width}x${height}`);
          break;
        } else {
          i += 2;
          const length = buffer[i] * 256 + buffer[i+1];
          i += length;
        }
      } else {
        i++;
      }
    }
  } else {
    console.log("Not a valid JPEG file");
  }
} catch (e) {
  console.error("Error:", e);
}
