const cloud = require('wx-server-sdk');
const { decryptFieldsFromDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courses = db.collection('courses');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    // 从事件中获取班级ID
    const { classId } = event;
    
    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空' };
    }
    
    // 获取班级信息
    const courseRes = await courses.doc(classId).get();
    
    if (!courseRes.data) {
      return { code: 404, success: false, message: '班级不存在' };
    }
    
    // 从数据库读取后，解密敏感字段（teacherName）
    let courseData = {
      id: courseRes.data._id,
      ...courseRes.data,
    };
    courseData = decryptFieldsFromDB(courseData, ['teacherName']);
    
    return {
      code: 200,
      success: true,
      data: courseData,
    };
  } catch (e) {
    console.error('getClassDetail error:', e);
    return { code: 500, success: false, message: '获取班级详情失败', error: e.message };
  }
};
