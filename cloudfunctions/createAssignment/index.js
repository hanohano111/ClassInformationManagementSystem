const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const assignments = db.collection('assignments');
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { classId, title, content, attachments, deadline } = event;

    if (!classId) {
      return { code: 400, success: false, message: '课程ID不能为空' };
    }
    if (!title || !title.trim()) {
      return { code: 400, success: false, message: '作业标题不能为空' };
    }

    // 检查权限：是否为管理员
    const memberRes = await courseMembers
      .where({
        courseId: classId,
        openid: openid,
      })
      .get();

    let isAdmin = memberRes.data.length > 0 && memberRes.data[0].role === 'admin';

    if (!isAdmin) {
      try {
        const courseRes = await courses.doc(classId).get();
        if (courseRes.data && courseRes.data.creatorOpenid === openid) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('createAssignment 查询课程信息失败:', e);
      }
    }

    if (!isAdmin) {
      return { code: 403, success: false, message: '无权限创建作业' };
    }

    // 获取用户信息
    const userRes = await users.where({ openid }).get();
    const creatorName = userRes.data.length > 0 ? userRes.data[0].name || '' : '';
    const creatorId = userRes.data.length > 0 ? userRes.data[0]._id : '';

    const assignmentData = {
      courseId: classId,
      title: title.trim(),
      content: content ? content.trim() : '',
      attachments: attachments || [],
      deadline: deadline || null,
      creatorId: creatorId,
      creatorOpenid: openid,
      creatorName: creatorName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const addRes = await assignments.add({ data: assignmentData });

    return {
      code: 200,
      success: true,
      data: {
        assignmentId: addRes._id,
        message: '创建成功',
      },
    };
  } catch (e) {
    console.error('createAssignment error:', e);
    return { code: 500, success: false, message: '创建作业失败', error: e.message };
  }
};
