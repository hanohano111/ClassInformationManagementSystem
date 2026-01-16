// common/aes.js
const crypto = require('crypto');

const DEFAULT_KEY = 'a9F$3dL!8kPz2xQw';
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || DEFAULT_KEY)
  .padEnd(32, '0')
  .slice(0, 32);
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function decrypt(ciphertext, ivEncoded) {
  if (!ciphertext) return '';
  if (!ivEncoded) {
    return '';
  }
  let iv;
  if (ivEncoded.length === IV_LENGTH) {
    iv = Buffer.from(ivEncoded, 'utf8');
  } else {
    iv = Buffer.from(ivEncoded, 'base64');
  }
  if (iv.length !== IV_LENGTH) {
    return '';
  }
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return '';
  }
}

function decryptFieldsFromDB(payload, fields) {
  const data = { ...payload };
  fields.forEach((field) => {
    const ivKey = `${field}_iv`;
    if (data[field] && data[ivKey]) {
      data[field] = decrypt(data[field], data[ivKey]);
    }
  });
  return data;
}

module.exports = {
  decrypt,
  decryptFieldsFromDB,
};
