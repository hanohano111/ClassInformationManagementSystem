const cloud = require('wx-server-sdk');
const { decryptFields, encryptFieldsForDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 1. 前端 AES 加密过的字段统一解密（除了 avatar）
    const input = decryptFields(event, ['name', 'studentNo', 'college', 'major', 'phone', 'teacherNo']);
    
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

    // 允许更新的字段（允许空字符串，因为用户可能想清空某些字段）
    // avatar 不加密，直接存储
    if (input.avatar !== undefined && input.avatar !== null) {
      updateData.avatar = String(input.avatar).trim();
      console.log('[updateUserInfo] 更新avatar:', updateData.avatar);
    }
    // 其他字段都需要加密存储
    if (input.name !== undefined && input.name !== null) {
      updateData.name = String(input.name).trim();
      console.log('[updateUserInfo] 更新name:', updateData.name ? '[已设置]' : '[空值]');
    }
    if (input.college !== undefined && input.college !== null) {
      updateData.college = String(input.college).trim();
      console.log('[updateUserInfo] 更新college:', updateData.college ? '[已设置]' : '[空值]');
    }
    if (input.major !== undefined && input.major !== null) {
      updateData.major = String(input.major).trim();
      console.log('[updateUserInfo] 更新major:', updateData.major ? '[已设置]' : '[空值]');
    }
    if (input.studentNo !== undefined && input.studentNo !== null) {
      updateData.studentNo = String(input.studentNo).trim();
      console.log('[updateUserInfo] 更新studentNo:', updateData.studentNo ? '[已设置]' : '[空值]');
    }
    if (input.teacherNo !== undefined && input.teacherNo !== null) {
      updateData.teacherNo = String(input.teacherNo).trim();
      console.log('[updateUserInfo] 更新teacherNo:', updateData.teacherNo ? '[已设置]' : '[空值]');
    }
    if (input.phone !== undefined && input.phone !== null) {
      updateData.phone = String(input.phone).trim();
      // 更新 phone_hash（用于搜索，不加密）
      const crypto = require('crypto');
      updateData.phone_hash = crypto.createHash('sha256').update(updateData.phone).digest('hex');
      console.log('[updateUserInfo] 更新phone:', updateData.phone ? '[已设置]' : '[空值]');
    }
    
    // 检查是否有实际要更新的字段（除了updatedAt）
    const updateFields = Object.keys(updateData).filter(k => k !== 'updatedAt');
    const hasUpdateFields = updateFields.length > 0;
    console.log('[updateUserInfo] 更新字段检查:', {
      updateFields,
      hasUpdateFields,
      updateDataKeys: Object.keys(updateData),
    });
    
    if (!hasUpdateFields) {
      console.warn('[updateUserInfo] 警告：没有要更新的字段');
      return {
        code: 400,
        success: false,
        message: '没有要更新的字段',
      };
    }

    // 4. 写库前再次 AES 加密所有字段（除了 avatar）
    const sensitiveFields = [];
    if (updateData.name !== undefined) sensitiveFields.push('name');
    if (updateData.college !== undefined) sensitiveFields.push('college');
    if (updateData.major !== undefined) sensitiveFields.push('major');
    if (updateData.phone !== undefined) sensitiveFields.push('phone');
    if (updateData.studentNo !== undefined) sensitiveFields.push('studentNo');
    if (updateData.teacherNo !== undefined) sensitiveFields.push('teacherNo');
    
    if (sensitiveFields.length > 0) {
      updateData = encryptFieldsForDB(updateData, sensitiveFields);
    }

    // 5. 更新用户信息
    console.log('[updateUserInfo] 准备更新用户信息:', {
      userId,
      updateData: JSON.stringify(updateData),
      updateDataKeys: Object.keys(updateData),
    });
    
    const updateRes = await users.doc(userId).update({
      data: updateData,
    });
    
    console.log('[updateUserInfo] 更新结果:', {
      stats: updateRes.stats,
      updated: updateRes.stats?.updated || 0,
    });
    
    // 验证更新是否成功
    if (updateRes.stats && updateRes.stats.updated === 0) {
      console.warn('[updateUserInfo] 警告：更新了0条记录，可能数据没有变化');
    }

    return {
      code: 200,
      success: true,
      message: '更新成功',
      data: {
        updated: updateRes.stats?.updated || 0,
      },
    };
  } catch (e) {
    console.error('updateUserInfo error:', e);
    return { code: 500, message: '更新失败', error: e.message };
  }
};
