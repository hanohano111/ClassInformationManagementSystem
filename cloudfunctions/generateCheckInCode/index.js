const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const checkInCodes = db.collection('checkin_codes');
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { courseId, code, expireTime, note } = event;

    if (!courseId) {
      return { code: 400, success: false, message: '课程ID不能为空' };
    }
    if (!code) {
      return { code: 400, success: false, message: '签到码不能为空' };
    }

    // 检查权限：是否为管理员
    const memberRes = await courseMembers
      .where({
        courseId: courseId,
        openid: openid,
      })
      .get();

    let isAdmin = memberRes.data.length > 0 && memberRes.data[0].role === 'admin';

    if (!isAdmin) {
      try {
        const courseRes = await courses.doc(courseId).get();
        if (courseRes.data && courseRes.data.creatorOpenid === openid) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('generateCheckInCode 查询课程信息失败:', e);
      }
    }

    if (!isAdmin) {
      return { code: 403, success: false, message: '无权限生成签到码' };
    }

    // 将之前的签到码标记为已过期（不删除，保留历史记录）
    const now = Date.now();
    await checkInCodes
      .where({
        courseId: courseId,
        expireTime: db.command.gt(now), // 只更新未过期的签到码
      })
      .update({
        data: {
          expireTime: now - 1, // 设置为已过期
        },
      });

    // 创建新签到码
    await checkInCodes.add({
      data: {
        courseId: courseId,
        code: code,
        expireTime: expireTime,
        note: note || '', // 签到提示
        createdAt: Date.now(),
      },
    });

    return {
      code: 200,
      success: true,
      message: '生成成功',
    };
  } catch (e) {
    console.error('generateCheckInCode error:', e);
    return { code: 500, success: false, message: '生成签到码失败', error: e.message };
  }
};
