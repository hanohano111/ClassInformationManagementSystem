const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const assignmentSubmissions = db.collection('assignment_submissions');
const assignments = db.collection('assignments');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { assignmentId, content, attachments } = event;

    if (!assignmentId) {
      return { code: 400, success: false, message: '作业ID不能为空' };
    }

    // 检查作业是否存在
    const assignmentRes = await assignments.doc(assignmentId).get();
    if (!assignmentRes.data) {
      return { code: 404, success: false, message: '作业不存在' };
    }

    // 检查是否超过截止时间
    const assignment = assignmentRes.data;
    if (assignment.deadline && Date.now() > assignment.deadline) {
      return { code: 400, success: false, message: '作业已超过截止时间，无法提交' };
    }

    // 检查是否已提交
    const existingRes = await assignmentSubmissions
      .where({
        assignmentId: assignmentId,
        openid: openid,
      })
      .get();

    if (existingRes.data.length > 0) {
      // 更新已有提交
      await assignmentSubmissions.doc(existingRes.data[0]._id).update({
        data: {
          content: content ? content.trim() : '',
          attachments: attachments || [],
          updatedAt: Date.now(),
        },
      });
    } else {
      // 创建新提交
      const userRes = await users.where({ openid }).get();
      const userId = userRes.data.length > 0 ? userRes.data[0]._id : '';

      await assignmentSubmissions.add({
        data: {
          assignmentId: assignmentId,
          userId: userId,
          openid: openid,
          content: content ? content.trim() : '',
          attachments: attachments || [],
          submittedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      });
    }

    return {
      code: 200,
      success: true,
      message: '提交成功',
    };
  } catch (e) {
    console.error('submitAssignment error:', e);
    return { code: 500, success: false, message: '提交作业失败', error: e.message };
  }
};
