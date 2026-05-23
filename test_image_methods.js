const { Jimp } = require('jimp');

Jimp.read('assets/product_label.jpg')
  .then(image => {
    console.log("image.crop:", typeof image.crop);
    console.log("image.resize:", typeof image.resize);
    console.log("image prototype constructor prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(image)));
  })
  .catch(err => console.error(err));
