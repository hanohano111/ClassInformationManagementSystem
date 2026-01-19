const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 根据 openid 查找用户
    const userRes = await users.where({ openid }).get();
    
    if (userRes.data.length === 0) {
      return { code: 404, message: '用户不存在' };
    }

    const user = userRes.data[0];

    // 从数据库读取后，解密所有加密字段（除了 avatar）
    let userData = {
      userId: user._id,
      name: user.name || '',
      name_iv: user.name_iv,
      avatar: user.avatar || '',
      role: user.role || 0,
      phone: user.phone || '',
      phone_iv: user.phone_iv,
      studentNo: user.studentNo || '',
      studentNo_iv: user.studentNo_iv,
      teacherNo: user.teacherNo || '',
      teacherNo_iv: user.teacherNo_iv,
      college: user.college || '',
      college_iv: user.college_iv,
      major: user.major || '',
      major_iv: user.major_iv,
      createdAt: user.createdAt || 0,
      updatedAt: user.updatedAt || 0,
    };

    // 解密所有加密字段（除了 avatar）
    userData = decryptFieldsFromDB(userData, ['name', 'studentNo', 'college', 'major', 'phone', 'teacherNo']);

    return {
      code: 200,
      success: true,
      data: userData,
    };
  } catch (e) {
    console.error('getUserInfo error:', e);
    return { code: 500, message: '获取用户信息失败', error: e.message };
  }
};
