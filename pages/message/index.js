// pages/message/index.js
Page({
  data: {
    classList: [],
    hiddenClassIds: [], // 隐藏的班级ID列表
    hasVisibleClasses: true, // 是否有可见的班级
    classSidebar: [
      {
        title: '加入班级',
        type: 'enter',
      },
      {
        title: '创建班级',
        type: 'create',
      },
      {
        title: '隐藏班级',
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

  /** 加载班级列表 */
  async loadClassList() {
    try {
      // 从本地存储获取隐藏的班级ID列表
      const hiddenClassIds = wx.getStorageSync('hiddenClassIds') || [];
      
      // 调用云函数获取班级列表
      const res = await wx.cloud.callFunction({
        name: 'getClassList',
      });
      
      const result = res.result || {};
      const classList = result.data || [];
      
      // 计算是否有可见的班级
      const hasVisibleClasses = classList.some(item => !hiddenClassIds.includes(item.id));
      
      this.setData({
        classList,
        hiddenClassIds,
        hasVisibleClasses,
      });
    } catch (error) {
      console.error('加载班级列表失败:', error);
      // 如果接口失败，使用空列表
    this.setData({
        classList: [],
        hasVisibleClasses: false,
    });
    }
  },

  /** 进入班级 */
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

  /** 显示进入班级对话框 */
  showEnterClassDialog() {
    wx.showModal({
      title: '加入班级',
      editable: true,
      placeholderText: '请输入6位班级码',
      success: async (res) => {
        if (res.confirm && res.content) {
          const classCode = res.content.trim().toUpperCase();
          
          // 验证班级码格式（6位数字+大写英文）
          if (!/^[0-9A-Z]{6}$/.test(classCode)) {
            wx.showToast({
              title: '班级码格式不正确',
              icon: 'none',
            });
            return;
          }
          
          await this.joinClass(classCode);
        }
      },
    });
  },

  /** 加入班级 */
  async joinClass(classCode) {
    wx.showLoading({ title: '加入中...' });
    
    try {
      // 调用云函数加入班级
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
      
      // 立即刷新班级列表
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

  /** 显示隐藏的班级 */
  showHiddenClasses() {
    const { classList, hiddenClassIds } = this.data;
    
    // 获取所有隐藏的班级
    const hiddenClasses = classList.filter(cls => hiddenClassIds.includes(cls.id));
    
    if (hiddenClasses.length === 0) {
      wx.showToast({
        title: '暂无隐藏的班级',
        icon: 'none',
      });
      return;
    }
    
    // 显示隐藏的班级列表，让用户选择显示
    const itemNames = hiddenClasses.map(cls => cls.name);
    
    wx.showActionSheet({
      title: '选择要显示的班级',
      itemList: itemNames,
      success: (res) => {
        const selectedClass = hiddenClasses[res.tapIndex];
        this.toggleClassVisibility(selectedClass.id, false); // false 表示显示
      },
    });
  },

  /** 切换班级显示/隐藏 */
  toggleClassVisibility(classId, hide) {
    let { hiddenClassIds, classList } = this.data;
    
    if (hide) {
      // 隐藏班级
      if (!hiddenClassIds.includes(classId)) {
        hiddenClassIds.push(classId);
      }
    } else {
      // 显示班级
      hiddenClassIds = hiddenClassIds.filter(id => id !== classId);
    }
    
    // 保存到本地存储
    wx.setStorageSync('hiddenClassIds', hiddenClassIds);
    
    // 计算是否有可见的班级
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
