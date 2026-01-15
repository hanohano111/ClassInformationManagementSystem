// pages/message/index.js
import request from '~/api/request';

Page({
  data: {
    classList: [],
    hiddenClassIds: [], // 隐藏的班级ID列表
    hasVisibleClasses: true, // 是否有可见的班级
    classSidebar: [
      {
        title: '进入课程',
        type: 'enter',
      },
      {
        title: '创建课程',
        type: 'create',
      },
      {
        title: '隐藏课程',
        type: 'hidden',
      },
    ],
  },

  onLoad() {
    this.loadClassList();
  },

  onShow() {
    this.loadClassList();
  },

  /** 加载课程列表 */
  async loadClassList() {
    try {
      // 从本地存储获取隐藏的课程ID列表
      const hiddenClassIds = wx.getStorageSync('hiddenClassIds') || [];
      
      // 调用云函数获取课程列表
      const res = await wx.cloud.callFunction({
        name: 'getClassList',
      });
      
      const result = res.result || {};
      const classList = result.data || [];
      
      // 计算是否有可见的课程
      const hasVisibleClasses = classList.some(item => !hiddenClassIds.includes(item.id));
      
      this.setData({
        classList,
        hiddenClassIds,
        hasVisibleClasses,
      });
    } catch (error) {
      console.error('加载课程列表失败:', error);
      // 如果接口失败，使用空列表
    this.setData({
        classList: [],
        hasVisibleClasses: false,
    });
    }
  },

  /** 进入课程 */
  enterClass(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/class/detail/index?id=${id}`,
    });
  },

  /** 处理页面目录点击 */
  onSidebarClick(e) {
    const { type } = e.detail.item;
    switch (type) {
      case 'enter':
        this.showEnterClassDialog();
        break;
      case 'create':
        wx.navigateTo({
          url: '/pages/class/create/index',
        });
        break;
      case 'hidden':
        this.showHiddenClasses();
        break;
    }
  },

  /** 显示进入课程对话框 */
  showEnterClassDialog() {
    wx.showModal({
      title: '加入课程',
      editable: true,
      placeholderText: '请输入6位课程码',
      success: async (res) => {
        if (res.confirm && res.content) {
          const classCode = res.content.trim().toUpperCase();
          
          // 验证课程码格式（6位数字+大写英文）
          if (!/^[0-9A-Z]{6}$/.test(classCode)) {
            wx.showToast({
              title: '课程码格式不正确',
              icon: 'none',
            });
            return;
          }
          
          await this.joinClass(classCode);
        }
      },
    });
  },

  /** 加入课程 */
  async joinClass(classCode) {
    wx.showLoading({ title: '加入中...' });
    
    try {
      // 调用云函数加入课程
      const res = await wx.cloud.callFunction({
        name: 'joinClass',
        data: {
          classCode,
        },
      });
      
      const result = res.result || {};
      
      if (result.code !== 200) {
        throw { message: result.message || '加入失败', data: result };
      }
      
      wx.hideLoading();
      
      wx.showToast({
        title: '加入成功',
        icon: 'success',
      });
      
      // 立即刷新课程列表
      await this.loadClassList();
    } catch (error) {
      wx.hideLoading();
      const errorMessage = error.data?.message || error.message || '加入失败';
      wx.showToast({
        title: errorMessage,
        icon: 'none',
      });
    }
  },

  /** 显示隐藏的课程 */
  showHiddenClasses() {
    const { classList, hiddenClassIds } = this.data;
    
    // 获取所有隐藏的课程
    const hiddenClasses = classList.filter(cls => hiddenClassIds.includes(cls.id));
    
    if (hiddenClasses.length === 0) {
      wx.showToast({
        title: '暂无隐藏的课程',
        icon: 'none',
      });
      return;
    }
    
    // 显示隐藏的课程列表，让用户选择显示
    const itemNames = hiddenClasses.map(cls => cls.name);
    
    wx.showActionSheet({
      title: '选择要显示的课程',
      itemList: itemNames,
      success: (res) => {
        const selectedClass = hiddenClasses[res.tapIndex];
        this.toggleClassVisibility(selectedClass.id, false); // false 表示显示
      },
    });
  },

  /** 切换课程显示/隐藏 */
  toggleClassVisibility(classId, hide) {
    let { hiddenClassIds, classList } = this.data;
    
    if (hide) {
      // 隐藏课程
      if (!hiddenClassIds.includes(classId)) {
        hiddenClassIds.push(classId);
      }
    } else {
      // 显示课程
      hiddenClassIds = hiddenClassIds.filter(id => id !== classId);
    }
    
    // 保存到本地存储
    wx.setStorageSync('hiddenClassIds', hiddenClassIds);
    
    // 计算是否有可见的课程
    const hasVisibleClasses = classList.some(item => !hiddenClassIds.includes(item.id));
    
    this.setData({
      hiddenClassIds,
      hasVisibleClasses,
    });
    
    wx.showToast({
      title: hide ? '已隐藏' : '已显示',
      icon: 'success',
    });
  },
});
