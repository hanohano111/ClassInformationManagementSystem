const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const leaveRequests = db.collection('leave_requests');

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

    const leave = {
      id: leaveRes.data._id,
      reason: leaveRes.data.reason || '',
      date: leaveRes.data.date || '',
      startTime: leaveRes.data.startTime,
      endTime: leaveRes.data.endTime,
      status: leaveRes.data.status || 0,
      comment: leaveRes.data.comment || '',
      attachments: leaveRes.data.attachments || [],
      studentName: leaveRes.data.studentName || '',
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
