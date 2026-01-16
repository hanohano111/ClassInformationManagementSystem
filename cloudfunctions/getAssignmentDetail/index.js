const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const assignments = db.collection('assignments');
const assignmentSubmissions = db.collection('assignment_submissions');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { assignmentId } = event;

    if (!assignmentId) {
      return { code: 400, success: false, message: '作业ID不能为空' };
    }

    const assignmentRes = await assignments.doc(assignmentId).get();

    if (!assignmentRes.data) {
      return { code: 404, success: false, message: '作业不存在' };
    }

    // 查询当前用户是否已提交
    const submissionRes = await assignmentSubmissions
      .where({
        assignmentId: assignmentId,
        openid: openid,
      })
      .get();

    const assignment = {
      id: assignmentRes.data._id,
      title: assignmentRes.data.title || '',
      content: assignmentRes.data.content || '',
      attachments: assignmentRes.data.attachments || [],
      courseId: assignmentRes.data.courseId,
      creatorId: assignmentRes.data.creatorId,
      creatorName: assignmentRes.data.creatorName || '',
      deadline: assignmentRes.data.deadline,
      createdAt: assignmentRes.data.createdAt,
      updatedAt: assignmentRes.data.updatedAt,
      hasSubmitted: submissionRes.data.length > 0,
      submission: submissionRes.data.length > 0 ? submissionRes.data[0] : null,
    };

    return {
      code: 200,
      success: true,
      data: assignment,
    };
  } catch (e) {
    console.error('getAssignmentDetail error:', e);
    return { code: 500, success: false, message: '获取作业详情失败', error: e.message };
  }
};
