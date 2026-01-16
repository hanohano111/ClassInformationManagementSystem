const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const checkInRecords = db.collection('checkin_records');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { courseId, latitude, longitude, accuracy } = event;

    if (!courseId) {
      return { code: 400, success: false, message: '课程ID不能为空' };
    }
    if (!latitude || !longitude) {
      return { code: 400, success: false, message: '定位信息不能为空' };
    }

    // 获取用户信息
    const userRes = await users.where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 401, success: false, message: '用户不存在' };
    }
    const userId = userRes.data[0]._id;

    // 检查今天是否已经签到过
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const recordRes = await checkInRecords
      .where({
        courseId: courseId,
        userId: userId,
        checkInType: 'location',
        checkInTime: db.command.gte(todayStart.getTime()).and(db.command.lte(todayEnd.getTime())),
      })
      .get();

    if (recordRes.data.length > 0) {
      return { code: 400, success: false, message: '您今天已经签到过了' };
    }

    // 创建签到记录
    await checkInRecords.add({
      data: {
        courseId: courseId,
        userId: userId,
        openid: openid,
        checkInType: 'location',
        latitude: latitude,
        longitude: longitude,
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
    console.error('checkInByLocation error:', e);
    return { code: 500, success: false, message: '签到失败', error: e.message };
  }
};
