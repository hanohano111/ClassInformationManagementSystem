import Mock from './WxMock';
// 导入包含path和data的对象
import loginMock from './login/index';
import homeMock from './home/index';
import searchMock from './search/index';
import dataCenter from './dataCenter/index';
import my from './my/index';
import classMock from './class/index';

// ========== 全局课程数据库（所有课程） ==========
// 获取全局课程数据库
function getAllClasses() {
  return wx.getStorageSync('mock_all_classes') || [];
}

// 添加课程到全局数据库
function addClassToGlobal(classData) {
  const allClasses = getAllClasses();
  const nextId = wx.getStorageSync('mock_global_class_id_counter') || 1;
  
  const newClass = {
    id: nextId,
    ...classData,
  };
  
  allClasses.push(newClass);
  wx.setStorageSync('mock_all_classes', allClasses);
  wx.setStorageSync('mock_global_class_id_counter', nextId + 1);
  
  console.log('[创建课程] 已保存到全局数据库:', {
    id: newClass.id,
    name: newClass.name,
    classCode: newClass.classCode,
    creatorId: newClass.creatorId,
  });
  console.log('[创建课程] 当前全局数据库中的课程数量:', allClasses.length);
  
  return newClass;
}

// 根据ID从全局数据库获取课程
function getClassById(classId) {
  const allClasses = getAllClasses();
  return allClasses.find(cls => cls.id === classId) || null;
}

// 根据课程码从全局数据库查找课程
function findClassByCode(classCode) {
  const allClasses = getAllClasses();
  console.log('[查找课程] 课程码:', classCode);
  console.log('[查找课程] 全局数据库中的课程数量:', allClasses.length);
  console.log('[查找课程] 全局数据库中的课程:', allClasses.map(c => ({ id: c.id, name: c.name, classCode: c.classCode })));
  const found = allClasses.find(cls => cls.classCode === classCode) || null;
  console.log('[查找课程] 查找结果:', found ? { id: found.id, name: found.name } : '未找到');
  return found;
}

// ========== 用户课程列表（只存储课程ID） ==========
// 获取用户的课程ID列表
function getUserClassIds(userId) {
  if (!userId) return [];
  const key = `mock_user_classes_${userId}`;
  return wx.getStorageSync(key) || [];
}

// 添加课程ID到用户的课程列表
function addClassIdToUser(userId, classId) {
  if (!userId) return false;
  
  const key = `mock_user_classes_${userId}`;
  const classIds = getUserClassIds(userId);
  
  // 检查是否已经存在
  if (classIds.includes(classId)) {
    return false;
  }
  
  classIds.push(classId);
  wx.setStorageSync(key, classIds);
  return true;
}

// 从用户的课程列表中删除课程ID
function removeClassIdFromUser(userId, classId) {
  if (!userId) return false;
  
  const key = `mock_user_classes_${userId}`;
  const classIds = getUserClassIds(userId);
  
  const index = classIds.indexOf(classId);
  if (index === -1) {
    return false;
  }
  
  classIds.splice(index, 1);
  wx.setStorageSync(key, classIds);
  return true;
}

// 获取用户的完整课程列表（根据ID从全局数据库获取详细信息）
function getUserClassList(userId) {
  if (!userId) return [];
  
  const classIds = getUserClassIds(userId);
  const allClasses = getAllClasses();
  
  // 根据ID从全局数据库获取课程详细信息
  return classIds
    .map(id => allClasses.find(cls => cls.id === id))
    .filter(cls => cls !== undefined); // 过滤掉不存在的课程
}

export default () => {
  // 在这里添加新的mock数据
  const mockData = [...loginMock, ...homeMock, ...searchMock, ...dataCenter, ...my, ...classMock];
  mockData.forEach((item) => {
    // 支持指定 method，如果不指定则匹配所有方法
    const mockPath = item.method ? `${item.method} ${item.path}` : item.path;
    
    // 对于创建课程接口，使用函数形式保存并返回
    if (item.path === '/api/class/create' && item.method === 'POST') {
      Mock.mock(mockPath, function(options) {
        // 从请求数据中获取信息
        const requestData = JSON.parse(options.body || '{}');
        
        // 从请求头或数据中获取用户ID
        const userId = requestData.userId || wx.getStorageSync('userId') || 'default';
        
        console.log('[创建课程] 当前用户ID:', userId);
        console.log('[创建课程] 课程信息:', {
          name: requestData.name,
          teacherName: requestData.teacherName,
          semester: requestData.semester,
          classCode: requestData.classCode,
        });
        
        // 1. 创建新课程并保存到全局课程数据库
        const newClass = addClassToGlobal({
          name: requestData.name,
          teacherName: requestData.teacherName,
          semester: requestData.semester,
          classCode: requestData.classCode,
          creatorId: userId, // 记录创建者ID
        });
        
        // 2. 将课程ID添加到用户的课程列表
        addClassIdToUser(userId, newClass.id);
        
        return {
          code: 200,
          success: true,
          data: {
            classId: newClass.id,
            classCode: newClass.classCode,
            message: '创建成功',
          },
        };
      });
    }
    // 对于加入课程接口
    else if (item.path === '/api/class/join' && item.method === 'POST') {
      Mock.mock(mockPath, function(options) {
        const requestData = JSON.parse(options.body || '{}');
        const classCode = requestData.classCode;
        
        // 从请求头或数据中获取用户ID
        const userId = requestData.userId || wx.getStorageSync('userId') || 'default';
        
        // 从全局课程数据库查找课程（通过课程码匹配）
        console.log('[加入课程] 当前用户ID:', userId);
        console.log('[加入课程] 查找课程码:', classCode);
        const foundClass = findClassByCode(classCode);
        
        if (foundClass) {
          // 检查用户是否已经加入过该课程
          const userClassIds = getUserClassIds(userId);
          if (userClassIds.includes(foundClass.id)) {
            return {
              code: 400,
              success: false,
              message: '您已加入该课程',
            };
          }
          
          // 将课程ID添加到用户的课程列表（课程已在全局数据库中）
          addClassIdToUser(userId, foundClass.id);
          
          return {
            code: 200,
            success: true,
            data: {
              classId: foundClass.id,
              className: foundClass.name,
              message: '加入成功',
            },
          };
        } else {
          // 课程码在全局数据库中不存在
          return {
            code: 404,
            success: false,
            message: '不存在该课程',
          };
        }
      });
    }
    // 对于获取课程列表接口，从用户的课程ID列表获取，然后从全局数据库获取详细信息
    else if (item.path === '/api/class/list' && item.method === 'GET') {
      Mock.mock(mockPath, function(options) {
        // 从请求参数或本地存储获取用户ID
        const userId = options.urlParams?.userId || options.data?.userId || wx.getStorageSync('userId') || 'default';
        
        // 获取该用户的完整课程列表（根据ID从全局数据库获取详细信息）
        const classList = getUserClassList(userId);
        
        return {
          code: 200,
          success: true,
          data: classList,
        };
      });
    }
    
    // 对于退出课程接口
    else if (item.path === '/api/class/exit' && item.method === 'POST') {
      Mock.mock(mockPath, function(options) {
        const requestData = JSON.parse(options.body || '{}');
        const classId = requestData.classId;
        
        // 从请求头或数据中获取用户ID
        const userId = requestData.userId || wx.getStorageSync('userId') || 'default';
        
        // 从用户的课程列表中删除课程ID（不删除全局数据库中的课程）
        const removed = removeClassIdFromUser(userId, classId);
        
        if (removed) {
          return {
            code: 200,
            success: true,
            message: '退出成功',
          };
        } else {
          return {
            code: 404,
            success: false,
            message: '课程不存在或已退出',
          };
        }
      });
    }
    // 其他接口使用普通模板
    else {
      Mock.mock(mockPath, { code: 200, success: true, data: item.data });
    }
  });

  // 添加获取单个课程信息的接口（使用函数形式处理动态路径）
  // 注意：Mock.js 不支持正则表达式作为 key，所以我们在 WxMock.js 中处理
};
