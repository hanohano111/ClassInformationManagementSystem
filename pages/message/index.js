// pages/message/index.js
Page({
  data: {
    classList: [
      { id: 1, name: '离散数学' },
      // 可以添加更多班级
    ],
    classSidebar: [
      {
        title: '进入班级',
        type: 'enter',
      },
      {
        title: '创建班级',
        type: 'create',
      },
      {
        title: '班级设置',
        type: 'settings',
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
  loadClassList() {
    // TODO: 从后端获取班级列表
    // 暂时使用模拟数据
    this.setData({
      classList: [
        { id: 1, name: '离散数学' },
      ],
    });
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
      case 'settings':
        wx.navigateTo({
          url: '/pages/class/settings/index',
        });
        break;
    }
  },

  /** 显示进入班级对话框 */
  showEnterClassDialog() {
    wx.showModal({
      title: '进入班级',
      editable: true,
      placeholderText: '请输入班级码',
      success: (res) => {
        if (res.confirm && res.content) {
          // TODO: 验证班级码并进入班级
          wx.showToast({
            title: '班级码：' + res.content,
            icon: 'none',
          });
        }
      },
    });
  },
});
