const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courseMembers = db.collection('course_members');
const courses = db.collection('courses');
const assignments = db.collection('assignments');
const assignmentSubmissions = db.collection('assignment_submissions');
const checkInCodes = db.collection('checkin_codes');
const checkInRecords = db.collection('checkin_records');
const leaveRequests = db.collection('leave_requests');
const notices = db.collection('notices');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 获取用户加入的所有课程
    const memberRes = await courseMembers.where({ openid }).get();
    if (memberRes.data.length === 0) {
      return { code: 200, success: true, data: [] };
    }

    const courseIds = memberRes.data.map(m => m.courseId);
    const memberMap = {}; // courseId -> { role, ... }
    memberRes.data.forEach(m => {
      memberMap[m.courseId] = m;
    });

    // 获取课程信息
    const coursePromises = courseIds.map(courseId => courses.doc(courseId).get());
    const courseResults = await Promise.all(coursePromises);
    const courseMap = {};
    courseResults.forEach((result, index) => {
      if (result.data) {
        courseMap[courseIds[index]] = result.data;
      }
    });

    const messages = [];
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000; // 最近一周的消息

    // 遍历每个课程
    for (const courseId of courseIds) {
      const course = courseMap[courseId];
      if (!course) continue;

      const member = memberMap[courseId];
      const isAdmin = member.role === 'admin' || course.creatorOpenid === openid;

      // 管理员消息：作业提交情况
      if (isAdmin) {
        // 获取该课程的所有作业
        const assignmentRes = await assignments
          .where({ courseId })
          .orderBy('createdAt', 'desc')
          .get();

        for (const assignment of assignmentRes.data) {
          // 获取该作业的所有提交（最近一周）
          const submissionRes = await assignmentSubmissions
            .where({
              assignmentId: assignment._id,
              createdAt: db.command.gte(oneWeekAgo),
            })
            .orderBy('createdAt', 'desc')
            .get();

          if (submissionRes.data.length > 0) {
            // 获取提交者信息
            const submitterOpenids = [...new Set(submissionRes.data.map(s => s.openid))];
            const userRes = await users
              .where({
                openid: db.command.in(submitterOpenids),
              })
              .get();
            const submitterNames = userRes.data.map(u => u.name || '未知用户').slice(0, 3);
            
            messages.push({
              type: 'assignment_submit',
              courseId: courseId,
              courseName: course.name || '未知课程',
              title: `作业提交：${assignment.title}`,
              content: `${submitterNames.join('、')}${submissionRes.data.length > 3 ? '等' : ''} ${submissionRes.data.length} 人提交了作业`,
              timestamp: submissionRes.data[0].submittedAt || submissionRes.data[0].createdAt || submissionRes.data[0].updatedAt,
              relatedId: assignment._id,
              relatedType: 'assignment',
            });
          }
        }

        // 管理员消息：签到情况（新生成的签到码）
        const checkInCodeRes = await checkInCodes
          .where({
            courseId: courseId,
            createdAt: db.command.gte(oneWeekAgo),
          })
          .orderBy('createdAt', 'desc')
          .get();

        for (const codeData of checkInCodeRes.data) {
          messages.push({
            type: 'checkin',
            courseId: courseId,
            courseName: course.name || '未知课程',
            title: '签到情况',
            content: codeData.note || `签到码：${codeData.code}`,
            timestamp: codeData.createdAt,
            relatedId: codeData.code,
            relatedType: 'checkin',
          });
        }

        // 管理员消息：请假申请（待审批）
        const leaveRes = await leaveRequests
          .where({
            courseId: courseId,
            status: 0, // 待审批
          })
          .orderBy('createdAt', 'desc')
          .get();

        for (const leave of leaveRes.data) {
          messages.push({
            type: 'leave_request',
            courseId: courseId,
            courseName: course.name || '未知课程',
            title: `请假申请：${leave.reason || '未填写原因'}`,
            content: `${leave.studentName || '未知用户'} 申请请假`,
            timestamp: leave.createdAt,
            relatedId: leave._id,
            relatedType: 'leave',
          });
        }
      }

      // 成员消息（包括管理员）：签到通知
      const checkInCodeNoticeRes = await checkInCodes
        .where({
          courseId: courseId,
          createdAt: db.command.gte(oneWeekAgo),
        })
        .orderBy('createdAt', 'desc')
        .get();

      for (const codeData of checkInCodeNoticeRes.data) {
        // 检查是否已签到
        const recordRes = await checkInRecords
          .where({
            courseId: courseId,
            checkInCode: codeData.code,
            openid: openid,
          })
          .get();

        if (recordRes.data.length === 0) {
          // 未签到，显示通知
          messages.push({
            type: 'checkin_notice',
            courseId: courseId,
            courseName: course.name || '未知课程',
            title: '签到通知',
            content: codeData.note || `签到码：${codeData.code}`,
            timestamp: codeData.createdAt,
            relatedId: codeData.code,
            relatedType: 'checkin',
          });
        }
      }

      // 成员消息（包括管理员）：通知
      const noticeRes = await notices
        .where({
          courseId: courseId,
          createdAt: db.command.gte(oneWeekAgo),
        })
        .orderBy('createdAt', 'desc')
        .get();

      for (const notice of noticeRes.data) {
        messages.push({
          type: 'notice',
          courseId: courseId,
          courseName: course.name || '未知课程',
          title: notice.title || '通知',
          content: notice.content || '',
          timestamp: notice.createdAt,
          relatedId: notice._id,
          relatedType: 'notice',
        });
      }

      // 成员消息（包括管理员）：作业通知
      const assignmentNoticeRes = await assignments
        .where({
          courseId: courseId,
          createdAt: db.command.gte(oneWeekAgo),
        })
        .orderBy('createdAt', 'desc')
        .get();

      for (const assignment of assignmentNoticeRes.data) {
        // 检查是否已提交
        const submissionRes = await assignmentSubmissions
          .where({
            assignmentId: assignment._id,
            openid: openid,
          })
          .get();

        if (submissionRes.data.length === 0) {
          // 未提交，显示通知
          messages.push({
            type: 'assignment_notice',
            courseId: courseId,
            courseName: course.name || '未知课程',
            title: `作业通知：${assignment.title}`,
            content: assignment.content || '',
            timestamp: assignment.createdAt,
            relatedId: assignment._id,
            relatedType: 'assignment',
          });
        }
      }
    }

    // 按时间倒序排列
    messages.sort((a, b) => b.timestamp - a.timestamp);

    return {
      code: 200,
      success: true,
      data: messages,
    };
  } catch (e) {
    console.error('getMessages error:', e);
    return { code: 500, success: false, message: '获取消息列表失败', error: e.message, data: [] };
  }
};
