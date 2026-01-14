const cloud = require('wx-server-sdk');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { decryptFields, encryptFieldsForDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 1. 前端 AES 加密过的 phone/password 统一解密
    const input = decryptFields(event, ['phone', 'password']);
    const { phone, password } = input;

    // 2. 基本校验
    const phoneReg = /^[1][3,4,5,7,8,9][0-9]{9}$/;
    if (!phoneReg.test(phone)) {
      return { code: 400, message: '手机号格式不正确' };
    }
    if (!password || password.length < 6) {
      return { code: 400, message: '密码长度至少6位' };
    }

    // 3. 用 hash 查重，避免遍历解密
    const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');
    const existRes = await users.where({ phone_hash: phoneHash }).get();
    if (existRes.data.length > 0) {
      return { code: 400, message: '该手机号已被注册' };
    }

    // 4. 密码 bcrypt 哈希
    const passwordHash = bcrypt.hashSync(password, 10);

    // 5. 写库前再次 AES 加密敏感字段（phone）
    // 默认用户名使用手机号，头像留空，后续可在「编辑资料」中修改
    let userToInsert = {
      phone,
      phone_hash: phoneHash,
      password_hash: passwordHash,
      openid,
      name: phone,
      avatar: '',
      role: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    userToInsert = encryptFieldsForDB(userToInsert, ['phone']);

    const addRes = await users.add({ data: userToInsert });

    return {
      code: 200,
      success: true,
      message: '注册成功',
      data: { userId: addRes._id },
    };
  } catch (e) {
    console.error('register error:', e);
    return { code: 500, message: '注册失败', error: e.message };
  }
};