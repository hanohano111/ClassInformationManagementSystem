// pages/class/create/index.js
import { generateClassCode } from '~/utils/util';
import { encryptFields } from '~/utils/crypto';

Page({
  data: {
    formData: {
      name: '',
      teacherName: '',
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

  onTeacherNameChange(e) {
    this.setData({
      'formData.teacherName': e.detail.value,
    });
    this.checkCanSubmit();
  },

  onSemesterChange(e) {
    this.setData({
      'formData.semester': e.detail.value,
    });
    this.checkCanSubmit();
  },

  checkCanSubmit() {
    const { name, teacherName, semester } = this.data.formData;
    this.setData({
      canSubmit: name.trim().length > 0 && teacherName.trim().length > 0 && semester.trim().length > 0,
    });
  },

  async createClass() {
    const { name, teacherName, semester } = this.data.formData;
    
    if (!name.trim() || !teacherName.trim() || !semester.trim()) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }
    
    wx.showLoading({ title: '创建中...' });
    
    try {
      // 生成6位随机课程码
      const classCode = generateClassCode();
      
      console.log('[创建课程] 开始创建，参数:', {
        name: name.trim(),
        teacherName: teacherName.trim(),
        semester: semester.trim(),
        classCode,
      });
      
      // 对敏感信息进行AES加密（老师姓名）
      const encryptedData = await encryptFields(
        {
          name: name.trim(),
          teacherName: teacherName.trim(),
          semester: semester.trim(),
          classCode,
        },
        ['teacherName'], // 只加密老师姓名
      );
      
      // 调用云函数创建课程
      const res = await wx.cloud.callFunction({
        name: 'createClass',
        data: encryptedData,
      });
      
      const result = res.result || {};
      console.log('[创建课程] 云函数响应:', result);
      
      if (result.code !== 200) {
        throw { message: result.message || '创建失败', data: result };
      }
      
      wx.hideLoading();
      
      // 显示课程码
      wx.showModal({
        title: '创建成功',
        content: `课程码：${result.data.classCode}\n\n请妥善保管课程码，用于邀请成员加入课程。`,
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          // 返回课程列表页面，触发刷新
          wx.navigateBack({
            success: () => {
              // 返回后刷新列表
              const pages = getCurrentPages();
              const currentPage = pages[pages.length - 1];
              if (currentPage && currentPage.loadClassList) {
                currentPage.loadClassList();
              }
            },
          });
        },
      });
    } catch (error) {
      console.error('[创建课程] 请求失败:', error);
      console.error('[创建课程] 错误详情:', {
        message: error.message,
        data: error.data,
        errMsg: error.errMsg,
        statusCode: error.statusCode,
      });
      
      wx.hideLoading();
      
      const errorMessage = error.data?.message || error.message || '创建失败';
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000,
      });
    }
  },
});
