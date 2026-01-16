const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const leaveRequests = db.collection('leave_requests');
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { leaveRequestId, status, comment } = event;

    if (!leaveRequestId) {
      return { code: 400, success: false, message: '请假ID不能为空' };
    }
    if (status === undefined || status === null) {
      return { code: 400, success: false, message: '审批状态不能为空' };
    }

    // 获取请假信息
    const leaveRes = await leaveRequests.doc(leaveRequestId).get();
    if (!leaveRes.data) {
      return { code: 404, success: false, message: '请假不存在' };
    }

    const courseId = leaveRes.data.courseId;

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
        console.error('approveLeaveRequest 查询课程信息失败:', e);
      }
    }

    if (!isAdmin) {
      return { code: 403, success: false, message: '无权限审批请假' };
    }

    // 更新请假状态
    await leaveRequests.doc(leaveRequestId).update({
      data: {
        status: status, // 1: 通过, 2: 拒绝
        comment: comment ? comment.trim() : '',
        approvedAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    return {
      code: 200,
      success: true,
      message: '审批成功',
    };
  } catch (e) {
    console.error('approveLeaveRequest error:', e);
    return { code: 500, success: false, message: '审批失败', error: e.message };
  }
};
