// pages/class/assignment-create/index.js

Page({
  data: {
    classId: null,
    form: {
      title: '',
      content: '',
      deadline: '',
      deadlineDate: '',
      deadlineTime: '',
      deadlineText: '',
      attachments: [],
    },
    minDate: '',
    submitting: false,
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    if (classId) {
      this.setData({ classId: String(classId) });
    } else {
      wx.showToast({ title: '课程ID不能为空', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }

    // 设置最小日期为今天
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const minDate = `${year}-${month}-${day}`;
    this.setData({ minDate });
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

  /** 截止日期选择 */
  onDeadlineDateChange(e) {
    const date = e.detail.value || '';
    this.setData({
      'form.deadlineDate': date,
    });
    this.updateDeadline();
  },

  /** 截止时间选择 */
  onDeadlineTimeChange(e) {
    const time = e.detail.value || '';
    this.setData({
      'form.deadlineTime': time,
    });
    this.updateDeadline();
  },

  /** 更新截止时间 */
  updateDeadline() {
    const { deadlineDate, deadlineTime } = this.data.form;
    if (deadlineDate && deadlineTime) {
      // 组合日期和时间，转换为时间戳
      const dateTimeStr = `${deadlineDate} ${deadlineTime}:00`;
      const deadline = new Date(dateTimeStr).getTime();
      const deadlineText = `${deadlineDate} ${deadlineTime}`;
      
      this.setData({
        'form.deadline': deadline,
        'form.deadlineText': deadlineText,
      });
    } else {
      this.setData({
        'form.deadline': '',
        'form.deadlineText': '',
      });
    }
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
    const cloudPath = `assignments/${Date.now()}_${file.name}`;
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
        title: '请输入作业标题',
        icon: 'none',
      });
      return;
    }

    if (!form.deadlineDate || !form.deadlineTime) {
      wx.showToast({
        title: '请选择截止日期和时间',
        icon: 'none',
      });
      return;
    }

    // 组合日期和时间，检查是否在未来
    const dateTimeStr = `${form.deadlineDate} ${form.deadlineTime}:00`;
    const deadline = new Date(dateTimeStr).getTime();
    if (deadline <= Date.now()) {
      wx.showToast({
        title: '截止时间必须在未来',
        icon: 'none',
      });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中...', mask: true });

    try {
      // 组合日期和时间
      const dateTimeStr = `${form.deadlineDate} ${form.deadlineTime}:00`;
      const deadline = new Date(dateTimeStr).getTime();

      const res = await wx.cloud.callFunction({
        name: 'createAssignment',
        data: {
          classId,
          title: form.title.trim(),
          content: form.content.trim(),
          attachments: form.attachments,
          deadline: deadline,
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
