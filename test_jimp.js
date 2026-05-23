const Jimp = require('jimp');
console.log(Object.keys(Jimp));
console.log(typeof Jimp);
if (Jimp.Jimp) {
  console.log("Jimp.Jimp keys:", Object.keys(Jimp.Jimp));
}
