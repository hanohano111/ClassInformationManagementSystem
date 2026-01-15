// common/aes.js
const crypto = require('crypto');

const DEFAULT_KEY = 'a9F$3dL!8kPz2xQw'; // 你给的密钥，正式环境建议改为环境变量 ENCRYPTION_KEY
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || DEFAULT_KEY)
  .padEnd(32, '0')
  .slice(0, 32); // AES-256 需要 32 字节 key
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

function decrypt(ciphertext, ivEncoded) {
  if (!ciphertext) return '';
  if (!ivEncoded) {
    throw new Error('IV is required for decryption');
  }
  // 兼容两种来源：
  // 1）小程序端传来的 16 位明文 IV（encryptFields）
  // 2）服务端存库时的 base64 编码 IV（encryptFieldsForDB）
  let iv;
  if (ivEncoded.length === IV_LENGTH) {
    // 16 字符，视为明文 IV
    iv = Buffer.from(ivEncoded, 'utf8');
  } else {
    // 其他长度，视为 base64 编码
    iv = Buffer.from(ivEncoded, 'base64');
  }
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function decryptFields(payload, fields) {
  const data = { ...payload };
  fields.forEach((field) => {
    const ivKey = `${field}_iv`;
    if (data[field] && data[ivKey]) {
      data[field] = decrypt(data[field], data[ivKey]);
    }
  });
  return data;
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

function decryptFieldsFromDB(payload, fields) {
  const data = { ...payload };
  fields.forEach((field) => {
    const ivKey = `${field}_iv`;
    if (data[field] && data[ivKey]) {
      data[field] = decrypt(data[field], data[ivKey]);
      // 删除 iv 字段，不需要返回给前端
      delete data[ivKey];
    }
  });
  return data;
}

module.exports = {
  encrypt,
  decrypt,
  decryptFields,
  encryptFieldsForDB,
  decryptFieldsFromDB,
};
