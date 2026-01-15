// pages/class/admin/index.js
import request from '~/api/request';

Page({
  data: {
    classId: null,
    admins: [], // 管理员列表
    settings: {
      noticeEnabled: true, // 通知功能开关
      assignmentEnabled: true, // 作业功能开关
      leaveEnabled: true, // 请假申请功能开关
    },
    newAdminInput: '', // 新管理员输入（用户ID或手机号）
  },

  onLoad(options) {
    const { classId } = options;
    if (classId) {
      this.setData({ classId });
      this.loadAdminList(classId);
      this.loadSettings(classId);
    }
  },

  /** 加载管理员列表 */
  async loadAdminList(classId) {
    try {
      const res = await request(`/api/class/${classId}/admin/list`, 'GET');
      const admins = res.data?.data || res.data || [];
      this.setData({ admins });
    } catch (error) {
      console.error('加载管理员列表失败:', error);
    }
  },

  /** 加载设置 */
  async loadSettings(classId) {
    try {
      const res = await request(`/api/class/${classId}/settings`, 'GET');
      const settings = res.data?.data || res.data || {};
      this.setData({ settings });
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  /** 切换通知功能 */
  async toggleNotice(e) {
    const enabled = e.detail.value;
    await this.updateSetting('noticeEnabled', enabled);
  },

  /** 切换作业功能 */
  async toggleAssignment(e) {
    const enabled = e.detail.value;
    await this.updateSetting('assignmentEnabled', enabled);
  },

  /** 切换请假申请功能 */
  async toggleLeave(e) {
    const enabled = e.detail.value;
    await this.updateSetting('leaveEnabled', enabled);
  },

  /** 更新设置 */
  async updateSetting(key, value) {
    const { classId } = this.data;
    
    try {
      await request(`/api/class/${classId}/settings`, 'PUT', {
        [key]: value,
      });

      this.setData({
        [`settings.${key}`]: value,
      });

      wx.showToast({
        title: '设置已更新',
        icon: 'success',
      });
    } catch (error) {
      wx.showToast({
        title: error.data?.message || error.message || '更新失败',
        icon: 'none',
      });
    }
  },

  /** 输入新管理员 */
  onNewAdminInput(e) {
    this.setData({
      newAdminInput: e.detail.value,
    });
  },

  /** 添加管理员 */
  async addAdmin() {
    const { newAdminInput, classId } = this.data;

    if (!newAdminInput.trim()) {
      wx.showToast({
        title: '请输入用户ID或手机号',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({ title: '添加中...' });

    try {
      await request(`/api/class/${classId}/admin/add`, 'POST', {
        userId: newAdminInput.trim(),
      });

      wx.hideLoading();
      wx.showToast({
        title: '添加成功',
        icon: 'success',
      });

      // 刷新管理员列表
      this.loadAdminList(classId);
      this.setData({
        newAdminInput: '',
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '添加失败',
        icon: 'none',
      });
    }
  },

  /** 删除管理员 */
  removeAdmin(e) {
    const { id } = e.currentTarget.dataset;
    const { admins } = this.data;

    if (admins.length <= 1) {
      wx.showToast({
        title: '至少保留一名管理员',
        icon: 'none',
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要移除该管理员吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteAdmin(id);
        }
      },
    });
  },

  /** 删除管理员 */
  async deleteAdmin(adminId) {
    const { classId } = this.data;

    wx.showLoading({ title: '删除中...' });

    try {
      await request(`/api/class/${classId}/admin/remove`, 'POST', {
        adminId,
      });

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success',
      });

      // 刷新管理员列表
      this.loadAdminList(classId);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '删除失败',
        icon: 'none',
      });
    }
  },
});
