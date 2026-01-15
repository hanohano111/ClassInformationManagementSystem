// pages/class/members/index.js

Page({
  data: {
    classId: null,
    memberList: [],
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    console.log('[课程成员] onLoad, classId:', classId);
    if (classId) {
      this.setData({ classId: String(classId) });
      this.loadClassMembers(String(classId));
    } else {
      console.error('[课程成员] 缺少 classId 参数');
      wx.showToast({ title: '课程id不能为空', icon: 'none' });
    }
  },

  /** 加载课程成员列表 */
  async loadClassMembers(classId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getClassMembers',
        data: {
          classId,
        },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载成员失败', data: result };
      }

      const members = result.data || [];
      this.setData({
        memberList: members,
      });
      console.log('[课程成员] 加载成功:', members);
      wx.hideLoading();
    } catch (error) {
      console.error('[课程成员] 加载失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '加载成员失败',
        icon: 'none',
      });
      this.setData({ memberList: [] });
    }
  },
});
