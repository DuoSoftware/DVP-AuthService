var crypto = require("crypto");

function Encrypt(plainText, workingKey) {
  var key = workingKey;
  var iv = "0123456789@#$%&*";
  var cipher = crypto.createCipheriv("aes-128-ctr", key, iv);
  var encoded = cipher.update(plainText, "utf8", "hex");
  encoded += cipher.final("hex");
  return encoded;
}

console.log(Encrypt("20400101", "DuoS123412341234"));
