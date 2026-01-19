const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const leaveRequests = db.collection('leave_requests');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const { leaveRequestId } = event;

    if (!leaveRequestId) {
      return { code: 400, success: false, message: '请假ID不能为空' };
    }

    const leaveRes = await leaveRequests.doc(leaveRequestId).get();

    if (!leaveRes.data) {
      return { code: 404, success: false, message: '请假不存在' };
    }

    // 取用户信息以解密姓名/学号
    let userData = {};
    if (leaveRes.data && leaveRes.data.openid) {
      const userRes = await users.where({ openid: leaveRes.data.openid }).get();
      if (userRes.data && userRes.data[0]) {
        userData = decryptFieldsFromDB(
          {
            name: userRes.data[0].name || leaveRes.data.studentName || '',
            name_iv: userRes.data[0].name_iv,
            studentNo: userRes.data[0].studentNo || '',
            studentNo_iv: userRes.data[0].studentNo_iv,
          },
          ['name', 'studentNo'],
        );
      }
    }

    const leave = {
      id: leaveRes.data._id,
      reason: leaveRes.data.reason || '',
      date: leaveRes.data.date || '',
      startTime: leaveRes.data.startTime,
      endTime: leaveRes.data.endTime,
      status: leaveRes.data.status || 0,
      comment: leaveRes.data.comment || '',
      attachments: leaveRes.data.attachments || [],
      studentName: userData.name || leaveRes.data.studentName || '',
      studentNo: userData.studentNo || '',
      courseId: leaveRes.data.courseId,
      createdAt: leaveRes.data.createdAt,
      updatedAt: leaveRes.data.updatedAt,
    };

    return {
      code: 200,
      success: true,
      data: leave,
    };
  } catch (e) {
    console.error('getLeaveRequestDetail error:', e);
    return { code: 500, success: false, message: '获取请假详情失败', error: e.message };
  }
};
