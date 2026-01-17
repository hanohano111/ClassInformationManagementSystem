const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const checkInCodes = db.collection('checkin_codes');
const checkInRecords = db.collection('checkin_records');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { courseId, code, latitude, longitude, accuracy } = event;

    if (!courseId) {
      return { code: 400, success: false, message: '班级ID不能为空' };
    }
    if (!code) {
      return { code: 400, success: false, message: '签到码不能为空' };
    }

    // 查询有效的签到码
    const now = Date.now();
    const codeRes = await checkInCodes
      .where({
        courseId: courseId,
        code: code,
        expireTime: db.command.gt(now),
      })
      .get();

    if (codeRes.data.length === 0) {
      return { code: 400, success: false, message: '签到码无效或已过期' };
    }

    // 获取用户信息
    const userRes = await users.where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 401, success: false, message: '用户不存在' };
    }
    const userId = userRes.data[0]._id;

    // 检查是否已经签到过
    const recordRes = await checkInRecords
      .where({
        courseId: courseId,
        userId: userId,
        checkInCode: code,
      })
      .get();

    if (recordRes.data.length > 0) {
      return { code: 400, success: false, message: '您已经签到过了' };
    }

    // 创建签到记录（包含定位信息）
    await checkInRecords.add({
      data: {
        courseId: courseId,
        userId: userId,
        openid: openid,
        checkInCode: code,
        checkInType: 'code',
        latitude: latitude || null,
        longitude: longitude || null,
        accuracy: accuracy || 0,
        checkInTime: Date.now(),
        createdAt: Date.now(),
      },
    });

    return {
      code: 200,
      success: true,
      message: '签到成功',
    };
  } catch (e) {
    console.error('checkInByCode error:', e);
    return { code: 500, success: false, message: '签到失败', error: e.message };
  }
};
