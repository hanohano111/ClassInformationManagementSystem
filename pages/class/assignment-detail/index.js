// pages/class/assignment-detail/index.js

Page({
  data: {
    assignmentId: null,
    classId: null,
    assignment: {},
  },

  /** 成员项点击，预览该成员提交的附件 */
  async onMemberTap(e) {
    const { index } = e.currentTarget.dataset;
    const { assignment } = this.data;
    if (!assignment || !assignment.memberSubmissionList) return;
    const member = assignment.memberSubmissionList[index];
    const attachments =
      member?.submission?.attachments ||
      member?.submissionAttachments ||
      [];
    if (!member || !member.hasSubmitted || !attachments.length) {
      wx.showToast({ title: '该成员暂无附件', icon: 'none' });
      return;
    }

    const itemList = attachments.map((att, i) => `${i + 1}. ${att.name || '附件'}`);

    try {
      const actionRes = await wx.showActionSheet({
        itemList,
      });
      const tapIndex = actionRes.tapIndex;
      const file = attachments[tapIndex];
      if (file && file.url) {
        this.previewAttachmentByFile(file);
      }
    } catch (err) {
      // 用户取消，无需提示
    }
  },

  onLoad(options) {
    const { assignmentId, classId } = options;
    if (assignmentId) {
      this.setData({
        assignmentId: String(assignmentId),
        classId: classId ? String(classId) : null,
      });
      this.loadAssignmentDetail(String(assignmentId));
    } else {
      wx.showToast({ title: '作业ID不能为空', icon: 'none' });
    }
  },

  onShow() {
    // 页面显示时刷新详情
    const { assignmentId } = this.data;
    if (assignmentId) {
      this.loadAssignmentDetail(assignmentId);
    }
  },

  /** 加载作业详情 */
  async loadAssignmentDetail(assignmentId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getAssignmentDetail',
        data: { assignmentId },
      });

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const assignment = result.data || {};
      assignment.createdAtText = this.formatTime(assignment.createdAt);
      assignment.deadlineText = assignment.deadline ? this.formatDeadlineTime(assignment.deadline) : '';
      // 检查是否过期
      if (assignment.deadline) {
        assignment.isOverdue = Date.now() > assignment.deadline;
      }
      // 格式化附件大小
      if (assignment.attachments) {
        assignment.attachments = assignment.attachments.map((att) => ({
          ...att,
          sizeText: this.formatFileSize(att.size),
        }));
      }

      // 格式化成员提交状态和时间
      if (assignment.memberSubmissionList && assignment.isAdmin) {
        assignment.memberSubmissionList = assignment.memberSubmissionList.map((member) => {
          const submittedAt = member.submittedAt;
          const isLate =
            member.hasSubmitted && assignment.deadline && submittedAt && submittedAt > assignment.deadline;
          return {
            ...member,
            submittedAtText: submittedAt ? this.formatTime(submittedAt) : '',
            submitStatusText: member.hasSubmitted ? (isLate ? '迟交' : '已提交') : '未提交',
          };
        });
      }

      this.setData({ assignment });
      wx.hideLoading();
    } catch (error) {
      console.error('[作业详情] 加载失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '加载失败',
        icon: 'none',
      });
    }
  },

  /** 格式化时间 */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /** 格式化截止时间 */
  formatDeadlineTime(timestamp) {
    if (!timestamp) return '';
    const deadline = new Date(timestamp);
    const now = new Date();
    const diff = deadline - now;
    
    const year = deadline.getFullYear();
    const month = String(deadline.getMonth() + 1).padStart(2, '0');
    const day = String(deadline.getDate()).padStart(2, '0');
    const hour = String(deadline.getHours()).padStart(2, '0');
    const minute = String(deadline.getMinutes()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day} ${hour}:${minute}`;
    
    if (diff < 0) {
      return `${timeStr} (已过期)`;
    } else if (diff < 3600000) {
      return `${timeStr} (${Math.floor(diff / 60000)}分钟后截止)`;
    } else if (diff < 86400000) {
      return `${timeStr} (${Math.floor(diff / 3600000)}小时后截止)`;
    } else {
      return timeStr;
    }
  },

  /** 格式化文件大小 */
  formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
  },

  /** 预览附件 */
  async previewAttachment(e) {
    const { url, name } = e.currentTarget.dataset;
    this.previewAttachmentByFile({ url, name });
  },

  /** 将 cloud:// 文件转为临时 HTTP */
  async getTempUrl(fileID) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [fileID] });
      const fileInfo = res?.fileList?.[0];
      if (fileInfo?.tempFileURL) return fileInfo.tempFileURL;

      // 前端无权限（STORAGE_EXCEED_AUTHORITY）时，走服务端兜底
      if (fileInfo?.errMsg && String(fileInfo.errMsg).includes('STORAGE_EXCEED_AUTHORITY')) {
        console.warn('[作业详情] getTempFileURL 无权限，改用云函数:', fileInfo);
        const cfRes = await wx.cloud.callFunction({
          name: 'getFileTempUrl',
          data: { fileID },
        });
        const r = cfRes?.result || {};
        if (r.code === 200 && r.data?.tempFileURL) return r.data.tempFileURL;
      }
    } catch (err) {
      console.error('[作业详情] 获取临时链接失败', err);
    }
    return '';
  },

  /** 直接传入文件对象预览/下载 */
  async previewAttachmentByFile(file) {
    const rawUrl = file?.url || file?.fileID || file?.fileId || file?.tempFileURL || '';
    const name = file?.name;
    const url = rawUrl;
    console.log('[作业详情] 点击附件:', { name, rawUrl, file });
    if (!url) {
      wx.showToast({ title: '附件链接无效', icon: 'none' });
      return;
    }

    const lowerName = (name || '').toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const isImage = imageExts.some((ext) => lowerName.endsWith(ext));
    const isCloud = url.startsWith('cloud://');

    const downloadCloudImage = async () => {
      if (isImage) {
        // 图片预览
        const tempUrl = isCloud ? await this.getTempUrl(url) : url;
        if (!tempUrl) throw new Error('无法获取附件链接');
        wx.previewImage({
          urls: [tempUrl],
          current: tempUrl,
        });
        return;
      }
      // 其他类型下载
      wx.showModal({
        title: '下载附件',
        content: `确定要下载 ${name || '附件'} 吗？`,
        success: async (res) => {
          if (!res.confirm) return;
          try {
            let filePath = '';
            if (isCloud) {
              // 先尝试云下载，失败再走临时 URL
              try {
                const downloadRes = await wx.cloud.downloadFile({ fileID: url });
                filePath = downloadRes.tempFilePath;
              } catch (err) {
                console.error('[作业详情] cloud.downloadFile 失败，尝试临时链接:', url, err);
                const tempUrl = await this.getTempUrl(url);
                console.log('[作业详情] getTempUrl 结果:', tempUrl);
                if (!tempUrl) {
                  throw new Error('文件链接无效或跨环境，无法获取临时链接');
                }
                filePath = await this._downloadByUrl(tempUrl);
              }
            } else {
              filePath = await this._downloadByUrl(url);
            }
            if (!filePath) throw new Error('无法获取文件');
            const fileType = this.getFileType(name, url, filePath);
            if (!fileType) {
              wx.showToast({ title: '不支持的文件类型', icon: 'none' });
              return;
            }
            wx.openDocument({
              filePath,
              fileType,
              showMenu: true,
              fail: (err) => {
                console.error('[作业详情] openDocument 失败:', err);
                wx.showToast({ title: '打开失败', icon: 'none' });
              },
            });
          } catch (err) {
            console.error('[作业详情] 下载失败:', err);
            wx.showToast({ title: '下载失败', icon: 'none' });
          }
        },
      });
    };

    try {
      await downloadCloudImage();
    } catch (err) {
      wx.showToast({ title: '预览失败', icon: 'none' });
    }
  },

  /** 使用 wx.downloadFile 并返回 tempFilePath（Promise 封装，兼容当前基础库） */
  _downloadByUrl(url) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url,
        success: (res) => {
          const filePath = res.tempFilePath || res.filePath || '';
          if (!filePath) {
            reject(new Error('downloadFile 返回空文件路径'));
          } else {
            resolve(filePath);
          }
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
  },

  /** 根据文件名/链接推断 fileType（仅返回小程序 openDocument 官方支持的类型） */
  getFileType(name = '', url = '', path = '') {
    const lower = (name || url || path || '').toLowerCase();
    const mapping = [
      { key: '.pdf', type: 'pdf' },
      { key: '.docx', type: 'docx' },
      { key: '.doc', type: 'doc' },
      { key: '.pptx', type: 'pptx' },
      { key: '.ppt', type: 'ppt' },
      { key: '.xlsx', type: 'xlsx' },
      { key: '.xls', type: 'xls' },
    ];
    // txt 在官方文档中未列入支持类型，这里不再强行映射，返回空交由上层提示“不支持”
    const hit = mapping.find((m) => lower.includes(m.key));
    return hit ? hit.type : '';
  },

  /** 进入提交作业页面 */
  goToSubmitAssignment() {
    const { assignmentId, classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/assignment-submit/index?assignmentId=${assignmentId}&classId=${classId}`,
    });
  },
});
