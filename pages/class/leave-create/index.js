// pages/class/leave-create/index.js

Page({
  data: {
    classId: null,
    form: {
      reason: '',
      date: '',
      attachments: [],
    },
    submitting: false,
    minDate: '1900-01-01',
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    if (classId) {
      this.setData({ classId: String(classId) });
    } else {
      wx.showToast({ title: '班级ID不能为空', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /** 请假原因输入 */
  onReasonInput(e) {
    this.setData({
      'form.reason': e.detail.value || '',
    });
  },

  /** 日期选择 */
  onDateChange(e) {
    const value = e.detail.value || '';
    console.log('[请假] 日期选择:', value);
    this.setData({
      'form.date': value,
    });
  },

  /** 添加附件 */
  addAttachment() {
    wx.chooseMessageFile({
      count: 9,
      type: 'file',
      success: async (res) => {
        const files = res.tempFiles || [];
        wx.showLoading({ title: '上传中...', mask: true });

        try {
          const uploadPromises = files.map((file) => this.uploadFile(file));
          const uploadResults = await Promise.all(uploadPromises);

          const attachments = this.data.form.attachments.concat(
            uploadResults.map((result) => ({
              name: result.name,
              url: result.url,
              size: result.size,
              sizeText: this.formatFileSize(result.size),
            }))
          );

          this.setData({
            'form.attachments': attachments,
          });

          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success',
          });
        } catch (error) {
          wx.hideLoading();
          wx.showToast({
            title: error.message || '上传失败',
            icon: 'none',
          });
        }
      },
      fail: (err) => {
        if (err.errMsg !== 'chooseMessageFile:fail cancel') {
          console.error('选择文件失败:', err);
          wx.showToast({
            title: '选择文件失败',
            icon: 'none',
          });
        }
      },
    });
  },

  /** 上传文件到云存储 */
  async uploadFile(file) {
    const cloudPath = `leave_requests/${Date.now()}_${file.name}`;
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath: file.path,
    });

    return {
      name: file.name,
      url: uploadRes.fileID,
      size: file.size,
    };
  },

  /** 移除附件 */
  removeAttachment(e) {
    const index = e.currentTarget.dataset.index;
    const attachments = this.data.form.attachments;
    attachments.splice(index, 1);
    this.setData({
      'form.attachments': attachments,
    });
  },

  /** 格式化文件大小 */
  formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
  },

  /** 取消 */
  cancel() {
    wx.navigateBack();
  },

  /** 提交 */
  async submit() {
    const { form, classId } = this.data;

    if (!form.reason.trim()) {
      wx.showToast({
        title: '请输入请假原因',
        icon: 'none',
      });
      return;
    }

    if (!form.date) {
      wx.showToast({
        title: '请选择请假日期',
        icon: 'none',
      });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'createLeaveRequest',
        data: {
          classId,
          reason: form.reason.trim(),
          date: form.date,
          attachments: form.attachments,
        },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '提交失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '提交成功',
        icon: 'success',
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({
        title: error.data?.message || error.message || '提交失败',
        icon: 'none',
      });
    }
  },
});
