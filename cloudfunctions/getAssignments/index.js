const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const assignments = db.collection('assignments');
const assignmentSubmissions = db.collection('assignment_submissions');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { classId } = event;

    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空', data: [] };
    }

    const assignmentRes = await assignments
      .where({
        courseId: classId,
      })
      .orderBy('createdAt', 'desc')
      .get();

    // 查询当前用户的所有提交记录
    const assignmentIds = assignmentRes.data.map((a) => a._id);
    const submissionRes = await assignmentSubmissions
      .where({
        assignmentId: db.command.in(assignmentIds),
        openid: openid,
      })
      .get();

    // 创建提交状态映射 - 确保使用字符串类型作为键
    const submissionMap = {};
    submissionRes.data.forEach((sub) => {
      // 确保 assignmentId 是字符串
      const assignmentId = String(sub.assignmentId || '');
      submissionMap[assignmentId] = {
        hasSubmitted: true,
        submittedAt: sub.submittedAt || sub.createdAt || null,
      };
    });

    const assignmentList = (assignmentRes.data || []).map((assignment) => {
      // 确保 _id 转换为字符串后再匹配
      const assignmentId = String(assignment._id || '');
      const submissionInfo = submissionMap[assignmentId] || { hasSubmitted: false, submittedAt: null };
      const hasSubmitted = Boolean(submissionInfo.hasSubmitted);
      const submittedAt = submissionInfo.submittedAt;
      const isOverdue = assignment.deadline && Date.now() > assignment.deadline;
      const isLate =
        hasSubmitted && assignment.deadline && submittedAt && submittedAt > assignment.deadline;

      // 解密布置人姓名
      let creator = {
        name: assignment.creatorName || '',
        name_iv: assignment.creatorName_iv,
      };
      creator = decryptFieldsFromDB(creator, ['name']);
      
      return {
        id: assignment._id,
        title: assignment.title || '',
        content: assignment.content || '',
        attachments: assignment.attachments || [],
        courseId: assignment.courseId,
        creatorId: assignment.creatorId,
        creatorName: creator.name || '',
        deadline: assignment.deadline,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        hasSubmitted: hasSubmitted,
        submittedAt: submittedAt,
        isOverdue: isOverdue,
        submitStatusText: hasSubmitted ? (isLate ? '迟交' : '已交') : '未交',
      };
    });

    return {
      code: 200,
      success: true,
      data: assignmentList,
    };
  } catch (e) {
    console.error('getAssignments error:', e);
    return { code: 500, success: false, message: '获取作业列表失败', error: e.message, data: [] };
  }
};
