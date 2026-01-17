// pages/class/notice-create/index.js

Page({
  data: {
    classId: null,
    form: {
      title: '',
      content: '',
      attachments: [],
    },
    submitting: false,
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

  /** 标题输入 */
  onTitleInput(e) {
    this.setData({
      'form.title': e.detail.value || '',
    });
  },

  /** 正文输入 */
  onContentInput(e) {
    this.setData({
      'form.content': e.detail.value || '',
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
        console.error('选择文件失败:', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none',
        });
      },
    });
  },

  /** 上传文件到云存储 */
  async uploadFile(file) {
    const cloudPath = `notices/${Date.now()}_${file.name}`;
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

    if (!form.title.trim()) {
      wx.showToast({
        title: '请输入通知标题',
        icon: 'none',
      });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'createNotice',
        data: {
          classId,
          title: form.title.trim(),
          content: form.content.trim(),
          attachments: form.attachments,
        },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '发布失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
        icon: 'success',
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({
        title: error.data?.message || error.message || '发布失败',
        icon: 'none',
      });
    }
  },
});
