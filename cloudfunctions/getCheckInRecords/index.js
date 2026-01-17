const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const checkInCodes = db.collection('checkin_codes');
const checkInRecords = db.collection('checkin_records');
const courseMembers = db.collection('course_members');
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const { courseId } = event;

    if (!courseId) {
      return { code: 400, success: false, message: '班级ID不能为空', data: [] };
    }

    // 检查权限：是否为管理员
    const memberRes = await courseMembers
      .where({
        courseId: courseId,
        openid: openid,
      })
      .get();

    let isAdmin = memberRes.data.length > 0 && memberRes.data[0].role === 'admin';

    if (!isAdmin) {
      try {
        const courses = db.collection('courses');
        const courseRes = await courses.doc(courseId).get();
        if (courseRes.data && courseRes.data.creatorOpenid === openid) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('getCheckInRecords 查询班级信息失败:', e);
      }
    }

    // 获取所有签到码记录（按创建时间倒序，包括已过期的）
    // 注意：不过滤过期时间，以显示所有历史记录
    const codesRes = await checkInCodes
      .where({
        courseId: courseId,
      })
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log(`[getCheckInRecords] 找到 ${codesRes.data.length} 条签到码记录`);

    const recordsList = [];

    // 获取所有班级成员
    const allMembersRes = await courseMembers
      .where({
        courseId: courseId,
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

    // 为每个签到码创建记录
    for (const codeData of codesRes.data) {
      // 获取该签到码的所有签到记录
      const recordsRes = await checkInRecords
        .where({
          courseId: courseId,
          checkInCode: codeData.code,
        })
        .get();

      const records = recordsRes.data || [];
      const recordMap = {};
      records.forEach((r) => {
        // 使用 userId 作为 key，因为 updateCheckInStatus 使用 userId 来查询和保存
        if (r.userId) {
          recordMap[r.userId] = r;
        } else if (r.openid) {
          // 兼容旧数据：如果没有 userId，使用 openid
          const user = Object.values(userMap).find(u => u.openid === r.openid);
          if (user && user._id) {
            recordMap[user._id] = r;
          }
        }
      });

      // 构建成员签到状态列表
      const memberStatusList = allMembersRes.data.map((member) => {
        const user = userMap[member.openid] || {};
        // 使用 userId 来匹配记录
        const record = user._id ? recordMap[user._id] : null;

        // 解密学号
        let studentNo = '';
        if (user.studentNo && user.studentNo_iv) {
          const decryptedUser = decryptFieldsFromDB(user, ['studentNo']);
          studentNo = decryptedUser.studentNo || '';
        }

        return {
          userId: user._id,
          name: user.name || '未设置名称',
          studentNo: studentNo,
          hasCheckedIn: !!record,
          checkInTime: record ? record.checkInTime : null,
          latitude: record && record.latitude ? record.latitude : null,
          longitude: record && record.longitude ? record.longitude : null,
          accuracy: record ? record.accuracy : null,
        };
      });

      recordsList.push({
        code: codeData.code,
        createdAt: codeData.createdAt,
        expireTime: codeData.expireTime,
        note: codeData.note || '', // 签到提示
        totalMembers: allMembersRes.data.length,
        checkedInCount: records.length,
        memberStatusList: memberStatusList,
      });
    }

    return {
      code: 200,
      success: true,
      data: recordsList,
    };
  } catch (e) {
    console.error('getCheckInRecords error:', e);
    return { code: 500, success: false, message: '获取签到记录失败', error: e.message, data: [] };
  }
};
