const cloud = require('wx-server-sdk');
const { decryptFields, encryptFieldsForDB } = require('./common/aes');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const courses = db.collection('courses');
const courseMembers = db.collection('course_members');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    // 1. 前端 AES 加密过的 teacherName 统一解密
    const input = decryptFields(event, ['teacherName']);
    const { name, teacherName, semester, classCode } = input;
    
    // 基本校验
    if (!name || !name.trim()) {
      return { code: 400, success: false, message: '班级名称不能为空' };
    }
    if (!classCode || !classCode.trim()) {
      return { code: 400, success: false, message: '班级码不能为空' };
    }
    
    // 检查班级码是否已存在
    const existCourse = await courses.where({ classCode: classCode.trim() }).get();
    if (existCourse.data.length > 0) {
      return { code: 400, success: false, message: '班级码已存在，请重新生成' };
    }
    
    // 从 users 集合获取用户信息
    const users = db.collection('users');
    const userRes = await users.where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 401, success: false, message: '用户不存在' };
    }
    const userId = userRes.data[0]._id;
    
    // 2. 创建班级数据
    let courseData = {
      name: name.trim(),
      teacherName: teacherName ? teacherName.trim() : '',
      semester: semester ? semester.trim() : '',
      classCode: classCode.trim(),
      creatorId: userId,
      creatorOpenid: openid,
      status: 1, // 1-启用
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // 3. 写库前再次 AES 加密敏感字段（teacherName）
    courseData = encryptFieldsForDB(courseData, ['teacherName']);
    
    const addRes = await courses.add({ data: courseData });
    const courseId = addRes._id;
    
    // 将创建者添加为班级成员（管理员）
    await courseMembers.add({
      data: {
        courseId: courseId,
        userId: userId,
        openid: openid,
        role: 'admin', // 创建者为管理员
        joinedAt: Date.now(),
      },
    });
    
    return {
      code: 200,
      success: true,
      data: {
        classId: courseId,
        classCode: classCode.trim(),
        message: '创建成功',
      },
    };
  } catch (e) {
    console.error('createClass error:', e);
    return { code: 500, success: false, message: '创建失败', error: e.message };
  }
};
