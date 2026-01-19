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

    // 获取用户加入的所有班级
    const memberRes = await courseMembers.where({ openid }).get();
    if (memberRes.data.length === 0) {
      return { code: 200, success: true, data: [] };
    }

    const courseIds = memberRes.data.map(m => m.courseId);
    const memberMap = {}; // courseId -> { role, ... }
    memberRes.data.forEach(m => {
      memberMap[m.courseId] = m;
    });

    // 获取班级信息
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

    // 遍历每个班级
    for (const courseId of courseIds) {
      const course = courseMap[courseId];
      if (!course) continue;

      const member = memberMap[courseId];
      const isAdmin = member.role === 'admin' || course.creatorOpenid === openid;

      // 该班级总成员数（用于“情况”统计）
      const membersRes = await courseMembers.where({ courseId }).get();
      const totalMembers = (membersRes.data || []).length;

      // 近一周的签到码
      const checkInCodeRes = await checkInCodes
        .where({
          courseId: courseId,
          createdAt: db.command.gte(oneWeekAgo),
        })
        .orderBy('createdAt', 'desc')
        .get();

      for (const codeData of checkInCodeRes.data) {
        if (isAdmin) {
          // 管理员看到签到“情况”：已签到人数/总人数
          const countRes = await checkInRecords
            .where({ courseId: courseId, checkInCode: codeData.code })
            .count();
          const checkedInCount = countRes.total || 0;
          messages.push({
            type: 'checkin',
            courseId: courseId,
            courseName: course.name || '未知班级',
            title: '签到情况',
            content: `已签到：${checkedInCount}/${totalMembers}${codeData.note ? `｜${codeData.note}` : ''}`,
            timestamp: codeData.createdAt,
            relatedId: codeData.code,
            relatedType: 'checkin',
          });
        } else {
          // 学生只提醒“未签到”
          const recordRes = await checkInRecords
            .where({
              courseId: courseId,
              checkInCode: codeData.code,
              openid: openid,
            })
            .get();
          if ((recordRes.data || []).length === 0) {
            messages.push({
              type: 'checkin_notice',
              courseId: courseId,
              courseName: course.name || '未知班级',
              title: '签到通知',
              content: codeData.note || `签到码：${codeData.code}`,
              timestamp: codeData.createdAt,
              relatedId: codeData.code,
              relatedType: 'checkin',
            });
          }
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
          courseName: course.name || '未知班级',
          title: notice.title || '通知',
          content: notice.content || '',
          timestamp: notice.createdAt,
          relatedId: notice._id,
          relatedType: 'notice',
        });
      }

      // 近一周的作业
      const assignmentRes = await assignments
        .where({
          courseId: courseId,
          createdAt: db.command.gte(oneWeekAgo),
        })
        .orderBy('createdAt', 'desc')
        .get();

      for (const assignment of assignmentRes.data) {
        if (isAdmin) {
          // 管理员看到作业“情况”：已交人数/总人数
          const countRes = await assignmentSubmissions.where({ assignmentId: assignment._id }).count();
          const submittedCount = countRes.total || 0;
          messages.push({
            type: 'assignment_notice',
            courseId: courseId,
            courseName: course.name || '未知班级',
            title: `作业：${assignment.title}`,
            content: `已交：${submittedCount}/${totalMembers}`,
            timestamp: assignment.createdAt,
            relatedId: assignment._id,
            relatedType: 'assignment',
          });
        } else {
          // 学生看到自己的提交状态（已交/迟交/未交）
          const submissionRes = await assignmentSubmissions
            .where({
              assignmentId: assignment._id,
              openid: openid,
            })
            .get();
          const hasSubmitted = (submissionRes.data || []).length > 0;
          const isOverdue = assignment.deadline && now > assignment.deadline;
          const statusText = hasSubmitted ? '已交' : (isOverdue ? '迟交' : '未交');
          messages.push({
            type: 'assignment_notice',
            courseId: courseId,
            courseName: course.name || '未知班级',
            title: `作业：${assignment.title}`,
            content: `状态：${statusText}`,
            timestamp: assignment.createdAt,
            relatedId: assignment._id,
            relatedType: 'assignment',
          });
        }
      }

      // 请假：管理员看到待审批；学生看到自己的审批结果/状态变化
      if (isAdmin) {
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
            courseName: course.name || '未知班级',
            title: `请假待审批：${leave.reason || '未填写原因'}`,
            content: `${leave.studentName || '未知用户'} 提交请假申请`,
            timestamp: leave.createdAt,
            relatedId: leave._id,
            relatedType: 'leave',
          });
        }
      } else {
        const myLeaveRes = await leaveRequests
          .where({
            courseId: courseId,
            openid: openid,
            updatedAt: db.command.gte(oneWeekAgo),
          })
          .orderBy('updatedAt', 'desc')
          .get();
        for (const leave of (myLeaveRes.data || [])) {
          const statusText = leave.status === 1 ? '已通过' : (leave.status === 2 ? '已拒绝' : '待审批');
          messages.push({
            type: 'leave_request',
            courseId: courseId,
            courseName: course.name || '未知班级',
            title: `请假：${statusText}`,
            content: leave.reason || '',
            timestamp: leave.updatedAt || leave.createdAt,
            relatedId: leave._id,
            relatedType: 'leave',
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
