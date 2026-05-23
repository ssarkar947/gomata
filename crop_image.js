const { Jimp } = require('jimp');

const labelPath = 'assets/product_label.jpg';

Jimp.read(labelPath)
  .then(async (image) => {
    console.log(`Successfully loaded image. Original size: ${image.bitmap.width}x${image.bitmap.height}`);
    
    // Crop 1: Full Front Panel (512x512) - Contains logo, cows, ghee pot
    const fullLogo = image.clone().crop({ x: 0, y: 0, w: 512, h: 512 });
    await fullLogo.write('assets/brand_logo_full.png');
    console.log("Saved full front panel to assets/brand_logo_full.png");
      
    // Crop 2: Just the text logo "GO MATA ORIGINAL GHEE"
    // Centers around x=256. Let's try x=90, y=40, w=340, h=210
    // In Jimp v1+, crop takes an object config: {x, y, w, h}
    const textLogo = image.clone().crop({ x: 90, y: 35, w: 340, h: 210 });
    await textLogo.write('assets/brand_logo_text.png');
    console.log("Saved text logo to assets/brand_logo_text.png");
  })
  .catch(err => {
    console.error("Error cropping image:", err);
  });
