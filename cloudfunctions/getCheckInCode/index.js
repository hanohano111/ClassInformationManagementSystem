const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const checkInCodes = db.collection('checkin_codes');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { courseId } = event;

    if (!courseId) {
      return { code: 400, success: false, message: '课程ID不能为空' };
    }

    // 查询当前有效的签到码
    const now = Date.now();
    const codeRes = await checkInCodes
      .where({
        courseId: courseId,
        expireTime: db.command.gt(now), // 未过期
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (codeRes.data.length === 0) {
      return {
        code: 200,
        success: true,
        data: null,
      };
    }

    const codeData = codeRes.data[0];
    return {
      code: 200,
      success: true,
      data: {
        code: codeData.code,
        expireTime: codeData.expireTime,
      },
    };
  } catch (e) {
    console.error('getCheckInCode error:', e);
    return { code: 500, success: false, message: '获取签到码失败', error: e.message };
  }
};
