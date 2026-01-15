const cloud = require('wx-server-sdk');
const { decryptFields, encryptFieldsForDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 1. 前端 AES 加密过的敏感字段统一解密
    const input = decryptFields(event, ['studentNo', 'teacherNo', 'phone']);
    
    // 2. 查找用户
    const userRes = await users.where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 404, message: '用户不存在' };
    }

    const userId = userRes.data[0]._id;

    // 3. 构建更新数据
    let updateData = {
      updatedAt: Date.now(),
    };

    // 允许更新的字段
    if (input.name !== undefined) {
      updateData.name = input.name.trim();
    }
    if (input.avatar !== undefined) {
      updateData.avatar = input.avatar.trim();
    }
    if (input.gender !== undefined) {
      updateData.gender = input.gender;
    }
    if (input.birth !== undefined) {
      updateData.birth = input.birth;
    }
    if (input.introduction !== undefined || input.brief !== undefined) {
      updateData.introduction = (input.introduction || input.brief || '').trim();
      updateData.brief = (input.introduction || input.brief || '').trim();
    }
    if (input.studentNo !== undefined) {
      updateData.studentNo = input.studentNo.trim();
    }
    if (input.teacherNo !== undefined) {
      updateData.teacherNo = input.teacherNo.trim();
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone.trim();
      // 更新 phone_hash
      const crypto = require('crypto');
      updateData.phone_hash = crypto.createHash('sha256').update(updateData.phone).digest('hex');
    }

    // 4. 写库前再次 AES 加密敏感字段
    const sensitiveFields = [];
    if (updateData.phone !== undefined) sensitiveFields.push('phone');
    if (updateData.studentNo !== undefined) sensitiveFields.push('studentNo');
    if (updateData.teacherNo !== undefined) sensitiveFields.push('teacherNo');
    
    if (sensitiveFields.length > 0) {
      updateData = encryptFieldsForDB(updateData, sensitiveFields);
    }

    // 5. 更新用户信息
    await users.doc(userId).update({
      data: updateData,
    });

    return {
      code: 200,
      success: true,
      message: '更新成功',
    };
  } catch (e) {
    console.error('updateUserInfo error:', e);
    return { code: 500, message: '更新失败', error: e.message };
  }
};
