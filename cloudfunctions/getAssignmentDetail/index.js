const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const assignments = db.collection('assignments');
const assignmentSubmissions = db.collection('assignment_submissions');
const courseMembers = db.collection('course_members');
const users = db.collection('users');

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

    const assignmentData = assignmentRes.data;

    // 检查权限：是否为管理员
    const memberRes = await courseMembers
      .where({
        courseId: assignmentData.courseId,
        openid: openid,
      })
      .get();

    let isAdmin = memberRes.data.length > 0 && memberRes.data[0].role === 'admin';

    if (!isAdmin) {
      try {
        const courses = db.collection('courses');
        const courseRes = await courses.doc(assignmentData.courseId).get();
        if (courseRes.data && courseRes.data.creatorOpenid === openid) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('getAssignmentDetail 查询课程信息失败:', e);
      }
    }

    // 查询当前用户是否已提交
    const submissionRes = await assignmentSubmissions
      .where({
        assignmentId: assignmentId,
        openid: openid,
      })
      .get();

    let memberSubmissionList = [];

    // 如果是管理员，获取所有成员的提交情况
    if (isAdmin) {
      // 获取所有课程成员
      const allMembersRes = await courseMembers
        .where({
          courseId: assignmentData.courseId,
        })
        .get();

      const memberOpenids = allMembersRes.data.map((m) => m.openid);
      const usersRes = await users
        .where({
          openid: db.command.in(memberOpenids),
        })
        .get();

      const userMap = {};
      usersRes.data.forEach((u) => {
        userMap[u.openid] = u;
      });

      // 获取所有提交记录
      const allSubmissionsRes = await assignmentSubmissions
        .where({
          assignmentId: assignmentId,
        })
        .get();

      const submissionMap = {};
      allSubmissionsRes.data.forEach((s) => {
        if (s.openid) {
          submissionMap[s.openid] = s;
        }
      });

      // 构建成员提交状态列表
      memberSubmissionList = allMembersRes.data.map((member) => {
        const user = userMap[member.openid] || {};
        const submission = submissionMap[member.openid] || null;

        return {
          userId: user._id,
          openid: member.openid,
          name: user.name || '未设置名称',
          hasSubmitted: !!submission,
          submittedAt: submission ? submission.submittedAt : null,
          submission: submission,
        };
      });
    }

    const assignment = {
      id: assignmentData._id,
      title: assignmentData.title || '',
      content: assignmentData.content || '',
      attachments: assignmentData.attachments || [],
      courseId: assignmentData.courseId,
      creatorId: assignmentData.creatorId,
      creatorName: assignmentData.creatorName || '',
      deadline: assignmentData.deadline,
      createdAt: assignmentData.createdAt,
      updatedAt: assignmentData.updatedAt,
      hasSubmitted: submissionRes.data.length > 0,
      submission: submissionRes.data.length > 0 ? submissionRes.data[0] : null,
      isAdmin: isAdmin,
      memberSubmissionList: memberSubmissionList,
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
