// pages/class/members/index.js

Page({
  data: {
    classId: null,
    memberList: [],
    isAdmin: false,
    currentUserId: '',
    currentOpenid: '',
    showAddMemberPopup: false,
    searchStudentNo: '',
    searching: false,
    showSetAdminPopup: false,
    adminStudentNo: '',
    settingAdmin: false,
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    console.log('[班级成员] onLoad, classId:', classId);
    if (classId) {
      this.setData({ classId: String(classId) });
      this.loadClassMembers(String(classId));
      this.checkAdminStatus(String(classId));
    } else {
      console.error('[班级成员] 缺少 classId 参数');
      wx.showToast({ title: '班级id不能为空', icon: 'none' });
    }

    const currentUserId = wx.getStorageSync('userId') || '';
    const currentOpenid = wx.getStorageSync('openid') || '';
    this.setData({ currentUserId: currentUserId ? String(currentUserId) : '', currentOpenid });
    
    // 监听用户信息更新事件
    const app = getApp();
    if (app && app.eventBus) {
      this.userInfoUpdateHandler = () => {
        console.log('[班级成员] 收到用户信息更新事件，准备重新加载成员列表');
        if (this.data.classId) {
          // 延迟一下确保数据库已更新完成
          console.log('[班级成员] 延迟500ms后刷新成员列表');
          setTimeout(() => {
            console.log('[班级成员] 开始刷新成员列表');
            this.loadClassMembers(this.data.classId);
          }, 500);
        } else {
          console.warn('[班级成员] classId为空，无法刷新');
        }
      };
      app.eventBus.on('user-info-updated', this.userInfoUpdateHandler);
      console.log('[班级成员] 已注册用户信息更新事件监听器');
    } else {
      console.warn('[班级成员] eventBus不存在，无法监听更新事件');
    }
  },

  onShow() {
    // 每次显示页面时刷新成员列表，确保显示最新数据
    if (this.data.classId) {
      console.log('[班级成员] onShow，重新加载成员列表，classId:', this.data.classId);
      // 添加短暂延迟，确保从其他页面返回时数据已更新
      setTimeout(() => {
        this.loadClassMembers(this.data.classId);
      }, 100);
    }
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    console.log('[班级成员] 下拉刷新');
    if (this.data.classId) {
      this.loadClassMembers(this.data.classId).then(() => {
        wx.stopPullDownRefresh();
      }).catch(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  onUnload() {
    // 移除事件监听
    const app = getApp();
    if (app && app.eventBus && this.userInfoUpdateHandler) {
      app.eventBus.off('user-info-updated', this.userInfoUpdateHandler);
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

  /** 加载班级成员列表 */
  async loadClassMembers(classId) {
    wx.showLoading({ title: '加载中...' });
    
    try {
      console.log('[班级成员] 开始加载成员列表，classId:', classId);
      
      // 添加时间戳参数，避免缓存
      const res = await wx.cloud.callFunction({
        name: 'getClassMembers',
        data: {
          classId,
          _timestamp: Date.now(), // 添加时间戳，强制刷新
        },
      });

      const result = res.result || {};
      console.log('[班级成员] 云函数返回结果:', result);
      console.log('[班级成员] 返回的成员数据:', JSON.stringify(result.data, null, 2));
      
      if (result.code !== 200) {
        throw { message: result.message || '加载成员失败', data: result };
      }

      const members = result.data || [];
      console.log('[班级成员] 解析后的成员列表:', members);
      console.log('[班级成员] 成员数量:', members.length);
      
      // 强制更新页面数据
      this.setData({
        memberList: members,
      });

      // 如果当前用户是创建者，兜底将 isAdmin 设为 true（防止某些环境 isAdmin 判定未及时更新）
      const { currentOpenid, isAdmin } = this.data;
      const isCreatorSelf = members.some(
        (m) => m.isCreator && currentOpenid && m.openid === currentOpenid
      );
      if (isCreatorSelf && !isAdmin) {
        console.log('[班级成员] 当前用户为创建者，兜底设 isAdmin=true');
        this.setData({ isAdmin: true });
      }
      
      console.log('[班级成员] 页面数据已更新，当前memberList:', this.data.memberList);
      console.log('[班级成员] isAdmin 状态:', this.data.isAdmin, 'currentOpenid:', this.data.currentOpenid);
      
      wx.hideLoading();
    } catch (error) {
      console.error('[班级成员] 加载失败:', error);
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

      // 重置状态并关闭弹窗
      this.setData({ 
        showAddMemberPopup: false, 
        searchStudentNo: '',
        searching: false, // 重置loading状态
      });
      
      // 重新加载成员列表（loadClassMembers内部会显示loading）
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

  /** 显示设置管理员弹窗 */
  showSetAdminModal() {
    this.setData({ showSetAdminPopup: true, adminStudentNo: '' });
  },

  /** 关闭设置管理员弹窗 */
  closeSetAdminPopup() {
    this.setData({ showSetAdminPopup: false, adminStudentNo: '' });
  },

  /** 设置管理员弹窗状态变化 */
  onSetAdminPopupChange(e) {
    this.setData({ showSetAdminPopup: e.detail.visible });
  },

  /** 管理员学号输入 */
  onAdminStudentNoInput(e) {
    this.setData({
      adminStudentNo: e.detail.value || '',
    });
  },

  /** 设置班级管理员 */
  async setClassAdmin() {
    const { adminStudentNo, classId } = this.data;

    if (!adminStudentNo.trim()) {
      wx.showToast({
        title: '请输入学号',
        icon: 'none',
      });
      return;
    }

    this.setData({ settingAdmin: true });
    wx.showLoading({ title: '设置中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'setClassAdmin',
        data: {
          classId,
          studentNo: adminStudentNo.trim(),
        },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '设置失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '设置成功',
        icon: 'success',
      });

      this.setData({ showSetAdminPopup: false, adminStudentNo: '' });
      // 重新加载成员列表
      await this.loadClassMembers(classId);
    } catch (error) {
      wx.hideLoading();
      this.setData({ settingAdmin: false });
      wx.showToast({
        title: error.data?.message || error.message || '设置失败',
        icon: 'none',
      });
    }
  },

  /** 行内按钮：设为管理员 */
  async onSetAdminBtn(e) {
    const { memberList, classId } = this.data;
    const index = e.currentTarget.dataset.index;
    const item = memberList[index];
    if (!item) return;
    if (this._isSelf(item)) {
      wx.showToast({ title: '不能操作自己', icon: 'none' });
      return;
    }

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '设置管理员',
        content: `确定将「${item.name || '该成员'}」设为管理员吗？`,
        confirmText: '确定',
        cancelText: '取消',
        success: (r) => resolve(r.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirm) return;

    wx.showLoading({ title: '设置中...', mask: true });
    try {
      const res2 = await wx.cloud.callFunction({
        name: 'setClassAdmin',
        data: { classId, userId: item.userId },
      });
      const result = res2.result || {};
      if (result.code !== 200) throw { message: result.message || '设置失败', data: result };
      wx.hideLoading();
      wx.showToast({ title: '设置成功', icon: 'success' });
      await this.loadClassMembers(classId);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.data?.message || err.message || '设置失败', icon: 'none' });
    }
  },

  /** 行内按钮：删除管理员（降级为成员，不踢出） */
  async onUnsetAdminBtn(e) {
    const { memberList, classId } = this.data;
    const index = e.currentTarget.dataset.index;
    const item = memberList[index];
    if (!item) return;
    if (this._isSelf(item)) {
      wx.showToast({ title: '不能操作自己', icon: 'none' });
      return;
    }

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '删除管理员',
        content: `确定将「${item.name || '该成员'}」降级为普通成员吗？（不会踢出班级）`,
        confirmText: '确定',
        cancelText: '取消',
        success: (r) => resolve(r.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirm) return;

    wx.showLoading({ title: '处理中...', mask: true });
    try {
      const res2 = await wx.cloud.callFunction({
        name: 'unsetClassAdmin',
        data: { classId, memberId: item.memberId },
      });
      const result = res2.result || {};
      if (result.code !== 200) throw { message: result.message || '操作失败', data: result };
      wx.hideLoading();
      wx.showToast({ title: '已删除管理员', icon: 'success' });
      await this.loadClassMembers(classId);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.data?.message || err.message || '操作失败', icon: 'none' });
    }
  },

  /** 行内按钮：删除成员（踢出班级） */
  async onKickMemberBtn(e) {
    const { memberList, classId } = this.data;
    const index = e.currentTarget.dataset.index;
    const item = memberList[index];
    if (!item) return;
    if (this._isSelf(item)) {
      wx.showToast({ title: '不能操作自己', icon: 'none' });
      return;
    }

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '删除成员',
        content: `确定将「${item.name || '该成员'}」踢出该班级吗？`,
        confirmText: '删除',
        confirmColor: '#ff4d4f',
        cancelText: '取消',
        success: (r) => resolve(r.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirm) return;

    wx.showLoading({ title: '处理中...', mask: true });
    try {
      const res2 = await wx.cloud.callFunction({
        name: 'removeClassMember',
        data: { classId, memberId: item.memberId },
      });
      const result = res2.result || {};
      if (result.code !== 200) throw { message: result.message || '删除失败', data: result };
      wx.hideLoading();
      wx.showToast({ title: '已删除成员', icon: 'success' });
      await this.loadClassMembers(classId);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.data?.message || err.message || '删除失败', icon: 'none' });
    }
  },

  /** 判断是否当前用户 */
  _isSelf(item) {
    const { currentUserId, currentOpenid } = this.data;
    if (item.userId && currentUserId && String(item.userId) === String(currentUserId)) return true;
    if (item.openid && currentOpenid && item.openid === currentOpenid) return true;
    return false;
  },
});
