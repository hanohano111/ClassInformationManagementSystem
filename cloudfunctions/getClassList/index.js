const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    // 从 users 集合获取用户信息
    const users = db.collection('users');
    const userRes = await users.where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 401, success: false, message: '用户不存在', data: [] };
    }
    const userId = userRes.data[0]._id;
    
    // 获取用户加入的所有班级ID
    const memberRes = await courseMembers.where({ openid }).get();
    const courseIds = memberRes.data.map(m => m.courseId);
    
    if (courseIds.length === 0) {
      return { code: 200, success: true, data: [] };
    }
    
    // 根据班级ID获取班级详细信息
    const courses = db.collection('courses');
    const courseList = [];
    
    // 使用 Promise.all 并行查询
    const coursePromises = courseIds.map(courseId => 
      courses.doc(courseId).get()
    );
    const courseResults = await Promise.all(coursePromises);
    
    courseResults.forEach((result, index) => {
      if (result.data) {
        let courseData = {
          id: courseIds[index],
          ...result.data,
        };
        // 从数据库读取后，解密敏感字段（teacherName）
        courseData = decryptFieldsFromDB(courseData, ['teacherName']);
        courseList.push(courseData);
      }
    });
    
    // 按创建时间倒序排列
    courseList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    return {
      code: 200,
      success: true,
      data: courseList,
    };
  } catch (e) {
    console.error('getClassList error:', e);
    return { code: 500, success: false, message: '获取班级列表失败', error: e.message, data: [] };
  }
};
