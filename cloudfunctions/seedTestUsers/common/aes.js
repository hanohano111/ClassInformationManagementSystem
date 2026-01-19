const crypto = require('crypto');

const DEFAULT_KEY = 'a9F$3dL!8kPz2xQw';
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || DEFAULT_KEY)
  .padEnd(32, '0')
  .slice(0, 32);
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function generateIV() {
  return crypto.randomBytes(IV_LENGTH);
}

function encrypt(plaintext) {
  const iv = generateIV();
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(String(plaintext), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return { ciphertext: encrypted, iv: iv.toString('base64') };
}

function encryptFieldsForDB(payload, fields) {
  const data = { ...payload };
  fields.forEach((field) => {
    if (data[field] != null) {
      const { ciphertext, iv } = encrypt(data[field]);
      data[field] = ciphertext;
      data[`${field}_iv`] = iv;
    }
  });
  return data;
}

module.exports = {
  encrypt,
  encryptFieldsForDB,
};
