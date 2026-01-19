const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const leaveRequests = db.collection('leave_requests');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { classId, isAdmin } = event;

    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空', data: [] };
    }

    let query = { courseId: classId };

    // 如果不是管理员，只显示自己的请假
    if (!isAdmin) {
      query.openid = openid;
    }

    const leaveRes = await leaveRequests
      .where(query)
      .orderBy('createdAt', 'desc')
      .get();

    // 获取所有相关的用户信息
    const openids = [...new Set(leaveRes.data.map((leave) => leave.openid))];
    const userRes = await users
      .where({
        openid: db.command.in(openids),
      })
      .get();

    const userMap = {};
    (userRes.data || []).forEach((u) => {
      userMap[u.openid] = u;
    });

    // 组装返回数据，解密姓名与学号
    const leaveList = (leaveRes.data || []).map((leave) => {
      const user = userMap[leave.openid] || {};
      
      let userData = {
        name: user.name || leave.studentName || '',
        name_iv: user.name_iv,
        studentNo: user.studentNo || '',
        studentNo_iv: user.studentNo_iv,
      };

      // 解密姓名与学号
      userData = decryptFieldsFromDB(userData, ['name', 'studentNo']);

      return {
        id: leave._id,
        reason: leave.reason || '',
        date: leave.date || '',
        startTime: leave.startTime,
        endTime: leave.endTime,
        status: leave.status || 0, // 0: 待审批, 1: 已通过, 2: 已拒绝
        comment: leave.comment || '',
        attachments: leave.attachments || [],
        studentName: userData.name || '',
        studentNo: userData.studentNo || '',
        createdAt: leave.createdAt,
        updatedAt: leave.updatedAt,
      };
    });

    return {
      code: 200,
      success: true,
      data: leaveList,
    };
  } catch (e) {
    console.error('getLeaveRequests error:', e);
    return { code: 500, success: false, message: '获取请假列表失败', error: e.message, data: [] };
  }
};
