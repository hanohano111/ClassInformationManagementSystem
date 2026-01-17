const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const assignments = db.collection('assignments');
const assignmentSubmissions = db.collection('assignment_submissions');
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { assignmentId } = event;

    if (!assignmentId) {
      return { code: 400, success: false, message: '作业ID不能为空' };
    }

    // 先获取作业信息，以便检查权限
    const assignmentRes = await assignments.doc(assignmentId).get();
    if (!assignmentRes.data) {
      return { code: 404, success: false, message: '作业不存在' };
    }

    const assignment = assignmentRes.data;
    const courseId = assignment.courseId;

    // 检查权限：是否为管理员或作业创建者
    const memberRes = await courseMembers
      .where({
        courseId: courseId,
        openid: openid,
      })
      .get();

    let isAdmin = memberRes.data.length > 0 && memberRes.data[0].role === 'admin';
    let isCreator = false;

    // 检查是否为创建者（兼容 creatorOpenid 和 creatorId）
    if (assignment.creatorOpenid === openid) {
      isCreator = true;
    } else if (assignment.creatorId) {
      // 如果作业中有 creatorId，通过 users 表查找 openid 来判断
      try {
        const users = db.collection('users');
        const userRes = await users.doc(assignment.creatorId).get();
        if (userRes.data && userRes.data.openid === openid) {
          isCreator = true;
        }
      } catch (e) {
        console.error('deleteAssignment 查询用户信息失败:', e);
      }
    }

    if (!isAdmin && !isCreator) {
      try {
        const courseRes = await courses.doc(courseId).get();
        if (courseRes.data && courseRes.data.creatorOpenid === openid) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('deleteAssignment 查询班级信息失败:', e);
      }
    }

    if (!isAdmin && !isCreator) {
      return { code: 403, success: false, message: '无权限删除作业' };
    }

    // 删除作业
    await assignments.doc(assignmentId).remove();

    // 同时删除相关的作业提交记录
    const submissionsRes = await assignmentSubmissions
      .where({
        assignmentId: assignmentId,
      })
      .get();

    if (submissionsRes.data.length > 0) {
      // 批量删除，每次最多 500 条（微信云数据库限制）
      const MAX_BATCH_SIZE = 500;
      const submissions = submissionsRes.data;
      
      for (let i = 0; i < submissions.length; i += MAX_BATCH_SIZE) {
        const batch = db.batch();
        const batchSubmissions = submissions.slice(i, i + MAX_BATCH_SIZE);
        batchSubmissions.forEach((submission) => {
          batch.delete(assignmentSubmissions.doc(submission._id));
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
    console.error('deleteAssignment error:', e);
    return { code: 500, success: false, message: '删除作业失败', error: e.message };
  }
};
