// pages/class/create/index.js
Page({
  data: {
    formData: {
      name: '',
      description: '',
      semester: '',
    },
    canSubmit: false,
  },

  onLoad() {},

  onNameChange(e) {
    this.setData({
      'formData.name': e.detail.value,
    });
    this.checkCanSubmit();
  },

  onDescriptionChange(e) {
    this.setData({
      'formData.description': e.detail.value,
    });
  },

  onSemesterChange(e) {
    this.setData({
      'formData.semester': e.detail.value,
    });
    this.checkCanSubmit();
  },

  checkCanSubmit() {
    const { name, semester } = this.data.formData;
    this.setData({
      canSubmit: name.trim().length > 0 && semester.trim().length > 0,
    });
  },

  async createClass() {
    const { name, description, semester } = this.data.formData;
    
    wx.showLoading({ title: '创建中...' });
    
    try {
      // TODO: 调用创建班级接口
      // await request('/api/class/create', { name, description, semester });
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      wx.hideLoading();
      wx.showToast({
        title: '创建成功',
        icon: 'success',
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '创建失败',
        icon: 'none',
      });
    }
  },
});
