const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const checkInRecords = db.collection('checkin_records');
const checkInCodes = db.collection('checkin_codes');
const courseMembers = db.collection('course_members');
const courses = db.collection('courses');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { courseId, checkInCode, userId, hasCheckedIn } = event;

    if (!courseId) {
      return { code: 400, success: false, message: '班级ID不能为空' };
    }
    if (!checkInCode) {
      return { code: 400, success: false, message: '签到码不能为空' };
    }
    if (!userId) {
      return { code: 400, success: false, message: '用户ID不能为空' };
    }
    if (typeof hasCheckedIn !== 'boolean') {
      return { code: 400, success: false, message: '签到状态参数错误' };
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
        console.error('updateCheckInStatus 查询班级信息失败:', e);
      }
    }

    if (!isAdmin) {
      return { code: 403, success: false, message: '无权限修改签到状态' };
    }

    // 获取用户信息
    const userRes = await users.doc(userId).get();
    if (!userRes.data) {
      return { code: 404, success: false, message: '用户不存在' };
    }
    const targetOpenid = userRes.data.openid;

    // 查询现有的签到记录（同时使用 userId 和 openid 查询，确保兼容性）
    const existingRecordRes = await checkInRecords
      .where({
        courseId: courseId,
        checkInCode: checkInCode,
      })
      .get();

    // 过滤出匹配的记录（优先使用 userId，如果没有则使用 openid）
    const matchedRecord = existingRecordRes.data.find(r => 
      (r.userId && r.userId === userId) || 
      (!r.userId && r.openid === targetOpenid)
    );

    if (hasCheckedIn) {
      // 设置为已签到：创建或更新签到记录
      if (matchedRecord) {
        // 更新现有记录，确保 userId 和 openid 都存在
        await checkInRecords.doc(matchedRecord._id).update({
          data: {
            userId: userId, // 确保 userId 存在
            openid: targetOpenid, // 确保 openid 存在
            checkInTime: Date.now(),
            updatedAt: Date.now(),
          },
        });
      } else {
        // 创建新记录
        await checkInRecords.add({
          data: {
            courseId: courseId,
            userId: userId,
            openid: targetOpenid,
            checkInCode: checkInCode,
            checkInType: 'code',
            latitude: null,
            longitude: null,
            accuracy: 0,
            checkInTime: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });
      }
    } else {
      // 设置为未签到：删除签到记录
      if (matchedRecord) {
        await checkInRecords.doc(matchedRecord._id).remove();
      }
    }

    return {
      code: 200,
      success: true,
      message: '修改成功',
    };
  } catch (e) {
    console.error('updateCheckInStatus error:', e);
    return { code: 500, success: false, message: '修改签到状态失败', error: e.message };
  }
};
