const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { code: 401, message: '获取微信信息失败，请重试' };
    }

    // 1. 根据 openid 查找用户
    const userRes = await users.where({ openid }).get();
    
    let user;
    let userId;

    if (userRes.data.length === 0) {
      // 2. 如果用户不存在，自动创建新用户
      const newUser = {
        openid,
        name: '', // 默认空，后续可在「编辑资料」中修改
        avatar: '', // 默认空，后续可在「编辑资料」中修改
        role: 0, // 默认普通用户
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const addRes = await users.add({ data: newUser });
      userId = addRes._id;
      user = { _id: userId, ...newUser };
    } else {
      // 3. 用户已存在，直接返回
      user = userRes.data[0];
      userId = user._id;
    }

    // 4. 返回用户信息
    return {
      code: 200,
      success: true,
      message: '登录成功',
      data: {
        userId: userId,
        role: user.role || 0,
        name: user.name || '',
        avatar: user.avatar || '',
      },
    };
  } catch (e) {
    console.error('login error:', e);
    return { code: 500, message: '登录失败', error: e.message };
  }
};
