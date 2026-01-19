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

    const { classId, reason, date, attachments } = event;

    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空' };
    }
    if (!reason || !reason.trim()) {
      return { code: 400, success: false, message: '请假原因不能为空' };
    }
    if (!date) {
      return { code: 400, success: false, message: '请假日期不能为空' };
    }

    // 获取用户信息并解密姓名（避免存入密文）
    const userRes = await users.where({ openid }).get();
    const rawUser = userRes.data.length > 0 ? userRes.data[0] : {};
    const decryptedUser = rawUser.name || rawUser.name_iv
      ? decryptFieldsFromDB(
          {
            name: rawUser.name || '',
            name_iv: rawUser.name_iv,
          },
          ['name'],
        )
      : { name: rawUser.name || '' };
    const studentName = decryptedUser.name || '';
    const userId = rawUser ? rawUser._id : '';

    // 将日期转换为当天的开始时间（00:00:00）和结束时间（23:59:59）
    const dateObj = new Date(date);
    const startTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0).getTime();
    const endTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59).getTime();

    const leaveData = {
      courseId: classId,
      userId: userId,
      openid: openid,
      reason: reason.trim(),
      date: date,
      startTime: startTime,
      endTime: endTime,
      attachments: attachments || [],
      status: 0, // 待审批
      studentName: studentName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const addRes = await leaveRequests.add({ data: leaveData });

    return {
      code: 200,
      success: true,
      data: {
        leaveRequestId: addRes._id,
        message: '提交成功',
      },
    };
  } catch (e) {
    console.error('createLeaveRequest error:', e);
    return { code: 500, success: false, message: '提交请假失败', error: e.message };
  }
};
