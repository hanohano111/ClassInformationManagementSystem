import Mock from './WxMock';
// 导入包含path和data的对象
import loginMock from './login/index';
import homeMock from './home/index';
import searchMock from './search/index';
import dataCenter from './dataCenter/index';
import my from './my/index';
import classMock from './class/index';

// ========== 全局班级数据库（所有班级） ==========
// 获取全局班级数据库
function getAllClasses() {
  return wx.getStorageSync('mock_all_classes') || [];
}

// 添加班级到全局数据库
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
  
  console.log('[创建班级] 已保存到全局数据库:', {
    id: newClass.id,
    name: newClass.name,
    classCode: newClass.classCode,
    creatorId: newClass.creatorId,
  });
  console.log('[创建班级] 当前全局数据库中的班级数量:', allClasses.length);
  
  return newClass;
}

// 根据ID从全局数据库获取班级
function getClassById(classId) {
  const allClasses = getAllClasses();
  return allClasses.find(cls => cls.id === classId) || null;
}

// 根据班级码从全局数据库查找班级
function findClassByCode(classCode) {
  const allClasses = getAllClasses();
  console.log('[查找班级] 班级码:', classCode);
  console.log('[查找班级] 全局数据库中的班级数量:', allClasses.length);
  console.log('[查找班级] 全局数据库中的班级:', allClasses.map(c => ({ id: c.id, name: c.name, classCode: c.classCode })));
  const found = allClasses.find(cls => cls.classCode === classCode) || null;
  console.log('[查找班级] 查找结果:', found ? { id: found.id, name: found.name } : '未找到');
  return found;
}

// ========== 用户班级列表（只存储班级ID） ==========
// 获取用户的班级ID列表
function getUserClassIds(userId) {
  if (!userId) return [];
  const key = `mock_user_classes_${userId}`;
  return wx.getStorageSync(key) || [];
}

// 添加班级ID到用户的班级列表
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

// 从用户的班级列表中删除班级ID
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

// 获取用户的完整班级列表（根据ID从全局数据库获取详细信息）
function getUserClassList(userId) {
  if (!userId) return [];
  
  const classIds = getUserClassIds(userId);
  const allClasses = getAllClasses();
  
  // 根据ID从全局数据库获取班级详细信息
  return classIds
    .map(id => allClasses.find(cls => cls.id === id))
    .filter(cls => cls !== undefined); // 过滤掉不存在的班级
}

export default () => {
  // 在这里添加新的mock数据
  const mockData = [...loginMock, ...homeMock, ...searchMock, ...dataCenter, ...my, ...classMock];
  mockData.forEach((item) => {
    // 支持指定 method，如果不指定则匹配所有方法
    const mockPath = item.method ? `${item.method} ${item.path}` : item.path;
    
    // 对于创建班级接口，使用函数形式保存并返回
    if (item.path === '/api/class/create' && item.method === 'POST') {
      Mock.mock(mockPath, function(options) {
        // 从请求数据中获取信息
        const requestData = JSON.parse(options.body || '{}');
        
        // 从请求头或数据中获取用户ID
        const userId = requestData.userId || wx.getStorageSync('userId') || 'default';
        
        console.log('[创建班级] 当前用户ID:', userId);
        console.log('[创建班级] 班级信息:', {
          name: requestData.name,
          teacherName: requestData.teacherName,
          semester: requestData.semester,
          classCode: requestData.classCode,
        });
        
        // 1. 创建新班级并保存到全局班级数据库
        const newClass = addClassToGlobal({
          name: requestData.name,
          teacherName: requestData.teacherName,
          semester: requestData.semester,
          classCode: requestData.classCode,
          creatorId: userId, // 记录创建者ID
        });
        
        // 2. 将班级ID添加到用户的班级列表
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
    // 对于加入班级接口
    else if (item.path === '/api/class/join' && item.method === 'POST') {
      Mock.mock(mockPath, function(options) {
        const requestData = JSON.parse(options.body || '{}');
        const classCode = requestData.classCode;
        
        // 从请求头或数据中获取用户ID
        const userId = requestData.userId || wx.getStorageSync('userId') || 'default';
        
        // 从全局班级数据库查找班级（通过班级码匹配）
        console.log('[加入班级] 当前用户ID:', userId);
        console.log('[加入班级] 查找班级码:', classCode);
        const foundClass = findClassByCode(classCode);
        
        if (foundClass) {
          // 检查用户是否已经加入过该班级
          const userClassIds = getUserClassIds(userId);
          if (userClassIds.includes(foundClass.id)) {
            return {
              code: 400,
              success: false,
              message: '您已加入该班级',
            };
          }
          
          // 将班级ID添加到用户的班级列表（班级已在全局数据库中）
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
          // 班级码在全局数据库中不存在
          return {
            code: 404,
            success: false,
            message: '不存在该班级',
          };
        }
      });
    }
    // 对于获取班级列表接口，从用户的班级ID列表获取，然后从全局数据库获取详细信息
    else if (item.path === '/api/class/list' && item.method === 'GET') {
      Mock.mock(mockPath, function(options) {
        // 从请求参数或本地存储获取用户ID
        const userId = options.urlParams?.userId || options.data?.userId || wx.getStorageSync('userId') || 'default';
        
        // 获取该用户的完整班级列表（根据ID从全局数据库获取详细信息）
        const classList = getUserClassList(userId);
        
        return {
          code: 200,
          success: true,
          data: classList,
        };
      });
    }
    
    // 对于退出班级接口
    else if (item.path === '/api/class/exit' && item.method === 'POST') {
      Mock.mock(mockPath, function(options) {
        const requestData = JSON.parse(options.body || '{}');
        const classId = requestData.classId;
        
        // 从请求头或数据中获取用户ID
        const userId = requestData.userId || wx.getStorageSync('userId') || 'default';
        
        // 从用户的班级列表中删除班级ID（不删除全局数据库中的班级）
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
            message: '班级不存在或已退出',
          };
        }
      });
    }
    // 其他接口使用普通模板
    else {
      Mock.mock(mockPath, { code: 200, success: true, data: item.data });
    }
  });

  // 添加获取单个班级信息的接口（使用函数形式处理动态路径）
  // 注意：Mock.js 不支持正则表达式作为 key，所以我们在 WxMock.js 中处理
};
