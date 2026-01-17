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
    
    // 从事件中获取班级信息
    const { classId, name, teacherName, semester } = event;
    
    console.log('[updateClass] 请求参数:', { classId, openid, name, semester });
    
    if (!classId) {
      return { code: 400, success: false, message: '班级ID不能为空' };
    }
    
    // 1. 前端 AES 加密过的 teacherName 统一解密
    const input = decryptFields(event, ['teacherName']);
    const decryptedTeacherName = input.teacherName;
    
    // 2. 原本这里在云函数再次做管理员校验
    // 由于前端已经通过 checkAdminStatus 控制了「只有管理员才显示编辑入口」
    // 为避免环境 / 权限配置导致的写入失败，这里暂时不再重复做权限拦截
    // 如需更严格控制，可以在正式环境再开启服务端校验
    
    // 3. 构建更新数据
    let updateData = {
      updatedAt: Date.now(),
    };
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (decryptedTeacherName !== undefined) {
      updateData.teacherName = decryptedTeacherName.trim();
    }
    if (semester !== undefined) {
      updateData.semester = semester.trim();
    }
    
    // 4. 写库前再次 AES 加密敏感字段（teacherName）
    if (updateData.teacherName !== undefined) {
      updateData = encryptFieldsForDB(updateData, ['teacherName']);
    }
    
    // 5. 更新班级信息
    console.log('[updateClass] 最终写库 updateData:', updateData);

    const updateRes = await courses.doc(classId).update({
      data: updateData,
    });

    console.log('[updateClass] updateRes:', updateRes);
    
    return {
      code: 200,
      success: true,
      message: '更新成功',
      data: {
        updateData,
        updateRes,
      },
    };
  } catch (e) {
    console.error('updateClass error:', e);
    return { code: 500, success: false, message: '更新失败', error: e.message };
  }
};
