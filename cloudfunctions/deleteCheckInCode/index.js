const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const checkInCodes = db.collection('checkin_codes');
const checkInRecords = db.collection('checkin_records');
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { courseId, code } = event;

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
        console.error('deleteCheckInCode 查询课程信息失败:', e);
      }
    }

    if (!isAdmin) {
      return { code: 403, success: false, message: '无权限删除签到码' };
    }

    // 查找签到码记录
    const codeRes = await checkInCodes
      .where({
        courseId: courseId,
        code: code,
      })
      .get();

    if (codeRes.data.length === 0) {
      return { code: 404, success: false, message: '签到码不存在' };
    }

    // 删除签到码记录
    await checkInCodes.doc(codeRes.data[0]._id).remove();

    // 同时删除相关的签到记录
    const recordsRes = await checkInRecords
      .where({
        courseId: courseId,
        checkInCode: code,
      })
      .get();

    if (recordsRes.data.length > 0) {
      // 批量删除，每次最多 500 条（微信云数据库限制）
      const MAX_BATCH_SIZE = 500;
      const records = recordsRes.data;
      
      for (let i = 0; i < records.length; i += MAX_BATCH_SIZE) {
        const batch = db.batch();
        const batchRecords = records.slice(i, i + MAX_BATCH_SIZE);
        batchRecords.forEach((record) => {
          batch.delete(checkInRecords.doc(record._id));
        });
        await batch.commit();
      }
    }

    return {
      code: 200,
      success: true,
      message: '删除成功',
    };
  } catch (e) {
    console.error('deleteCheckInCode error:', e);
    return { code: 500, success: false, message: '删除签到码失败', error: e.message };
  }
};
