// pages/class/members/index.js

Page({
  data: {
    classId: null,
    memberList: [],
    isAdmin: false,
    showAddMemberPopup: false,
    searchStudentNo: '',
    searching: false,
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    console.log('[课程成员] onLoad, classId:', classId);
    if (classId) {
      this.setData({ classId: String(classId) });
      this.loadClassMembers(String(classId));
      this.checkAdminStatus(String(classId));
    } else {
      console.error('[课程成员] 缺少 classId 参数');
      wx.showToast({ title: '课程id不能为空', icon: 'none' });
    }
  },

  /** 检查管理员状态 */
  async checkAdminStatus(classId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdminStatus',
        data: { classId },
      });
      const result = res.result || {};
      const isAdmin = result.data?.isAdmin || false;
      this.setData({ isAdmin });
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      this.setData({ isAdmin: false });
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

  /** 显示添加成员弹窗 */
  showAddMemberModal() {
    this.setData({ showAddMemberPopup: true, searchStudentNo: '' });
  },

  /** 关闭添加成员弹窗 */
  closeAddMemberPopup() {
    this.setData({ showAddMemberPopup: false, searchStudentNo: '' });
  },

  /** 添加成员弹窗状态变化 */
  onAddMemberPopupChange(e) {
    this.setData({ showAddMemberPopup: e.detail.visible });
  },

  /** 学号输入 */
  onStudentNoInput(e) {
    this.setData({
      searchStudentNo: e.detail.value || '',
    });
  },

  /** 搜索并添加成员 */
  async searchAndAddMember() {
    const { searchStudentNo, classId } = this.data;

    if (!searchStudentNo.trim()) {
      wx.showToast({
        title: '请输入学号',
        icon: 'none',
      });
      return;
    }

    this.setData({ searching: true });
    wx.showLoading({ title: '搜索中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'addClassMember',
        data: {
          classId,
          studentNo: searchStudentNo.trim(),
        },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '添加失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '添加成功',
        icon: 'success',
      });

      this.setData({ showAddMemberPopup: false, searchStudentNo: '' });
      // 重新加载成员列表
      await this.loadClassMembers(classId);
    } catch (error) {
      wx.hideLoading();
      this.setData({ searching: false });
      wx.showToast({
        title: error.data?.message || error.message || '添加失败',
        icon: 'none',
      });
    }
  },
});
