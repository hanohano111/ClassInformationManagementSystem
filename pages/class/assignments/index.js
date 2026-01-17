// pages/class/assignments/index.js
const app = getApp();

Page({
  data: {
    classId: null,
    assignmentList: [],
    isAdmin: false,
    touchStartX: 0,
    touchStartY: 0,
    currentIndex: -1, // 当前滑动的项索引
    isTouching: false, // 是否正在触摸滑动
  },

  onLoad(options) {
    const classId = options.classId || options.id;
    if (classId) {
      this.setData({ classId: String(classId) });
      this.loadAssignments(String(classId));
      this.checkAdminStatus(String(classId));
    } else {
      wx.showToast({ title: '课程ID不能为空', icon: 'none' });
    }

    // 监听作业提交事件 - 保存绑定后的函数引用以便正确移除
    this.onAssignmentSubmittedHandler = this.onAssignmentSubmitted.bind(this);
    if (app.eventBus) {
      app.eventBus.on('assignment-submitted', this.onAssignmentSubmittedHandler);
    }
  },

  onUnload() {
    // 移除事件监听 - 使用保存的引用
    if (app.eventBus && this.onAssignmentSubmittedHandler) {
      app.eventBus.off('assignment-submitted', this.onAssignmentSubmittedHandler);
    }
  },

  /** 作业提交事件处理 */
  onAssignmentSubmitted() {
    // 刷新作业列表
    const { classId } = this.data;
    if (classId) {
      console.log('[作业列表] 收到作业提交事件，刷新列表');
      this.loadAssignments(classId);
    }
  },

  onShow() {
    // 页面显示时刷新列表
    const { classId } = this.data;
    if (classId) {
      console.log('[作业列表] onShow 触发，刷新列表，classId:', classId);
      this.loadAssignments(classId);
    }
  },

  /** 加载作业列表 */
  async loadAssignments(classId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getAssignments',
        data: { classId },
      });

      if (!res || !res.result) {
        throw { message: '云函数调用失败，请检查云函数是否已上传', data: res };
      }

      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }

      const assignments = result.data || [];
      // 格式化时间并确保状态字段正确
      const assignmentList = assignments.map((assignment) => {
        // 确保 hasSubmitted 是布尔值
        const hasSubmitted = Boolean(assignment.hasSubmitted);
        // 确保 isOverdue 是布尔值
        const isOverdue = Boolean(assignment.isOverdue);
        
        return {
        ...assignment,
          id: String(assignment.id || assignment._id || ''),
        createdAtText: this.formatTime(assignment.createdAt),
        deadlineText: assignment.deadline ? this.formatDeadlineTime(assignment.deadline) : '',
          translateX: 0, // 初始化滑动距离
          // 明确设置提交状态
          hasSubmitted: hasSubmitted,
          isOverdue: isOverdue,
        };
      });

      console.log('[作业列表] 加载完成，作业数量:', assignmentList.length);
      console.log('[作业列表] 提交状态详情:', assignmentList.map(a => ({ 
        id: a.id, 
        title: a.title, 
        hasSubmitted: a.hasSubmitted, 
        isOverdue: a.isOverdue 
      })));

      this.setData({ assignmentList });
      wx.hideLoading();
    } catch (error) {
      console.error('[作业列表] 加载失败:', error);
      wx.hideLoading();
      
      let errorMsg = '加载失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 getAssignments 云函数';
      } else if (error.data?.message) {
        errorMsg = error.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000,
      });
      this.setData({ assignmentList: [] });
    }
  },

  /** 格式化截止时间 */
  formatDeadlineTime(timestamp) {
    if (!timestamp) return '';
    const deadline = new Date(timestamp);
    const now = new Date();
    const diff = deadline - now;
    
    if (diff < 0) {
      return '已过期';
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟后截止';
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时后截止';
    } else {
      const year = deadline.getFullYear();
      const month = String(deadline.getMonth() + 1).padStart(2, '0');
      const day = String(deadline.getDate()).padStart(2, '0');
      const hour = String(deadline.getHours()).padStart(2, '0');
      const minute = String(deadline.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
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

  /** 格式化时间 */
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前';
    } else if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前';
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  },

  /** 点击作业 */
  onAssignmentTap(e) {
    const { assignmentId, index } = e.currentTarget.dataset;
    const assignment = this.data.assignmentList[index];
    if (!assignment) return;

    // 如果当前项处于滑动状态，先恢复
    if (this.data.currentIndex === index) {
      this.setData({ currentIndex: -1 });
      return;
    }

    // 跳转到详情页面
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/assignment-detail/index?assignmentId=${assignmentId}&classId=${classId}`,
    });
  },

  /** 触摸开始 */
  onTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      isTouching: true,
    });
  },

  /** 触摸移动 */
  onTouchMove(e) {
    const touch = e.touches[0];
    const { index } = e.currentTarget.dataset;
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = Math.abs(touch.clientY - this.data.touchStartY);

    // 如果是垂直滑动，不处理
    if (deltaY > 30) {
      return;
    }

    // 只有管理员才能滑动删除
    if (!this.data.isAdmin) {
      return;
    }

    // 左滑：deltaX < 0，右滑：deltaX > 0
    // 按钮宽度：88rpx + 16rpx(间距) + 20rpx(右边距) = 124rpx
    let translateX = deltaX;
    if (translateX < -124) {
      translateX = -124; // 最大左滑距离（圆形按钮的宽度）
    } else if (translateX > 0) {
      translateX = 0; // 不允许右滑超过原始位置
    }

    // 关闭其他已打开的项
    const assignmentList = this.data.assignmentList.map((assignment, i) => {
      if (i === index) {
        return { ...assignment, translateX };
      } else if (i === this.data.currentIndex && this.data.currentIndex !== -1) {
        return { ...assignment, translateX: 0 };
      }
      return assignment;
    });

    this.setData({
      assignmentList,
      currentIndex: translateX < -50 ? index : -1,
    });
  },

  /** 触摸结束 */
  onTouchEnd(e) {
    const { index } = e.currentTarget.dataset;
    const assignment = this.data.assignmentList[index];
    if (!assignment) return;

    let translateX = assignment.translateX || 0;

    // 如果左滑超过62rpx（一半距离），自动展开到最大距离
    if (translateX < -62) {
      translateX = -124;
    } else {
      // 否则自动收起
      translateX = 0;
    }

    const assignmentList = [...this.data.assignmentList];
    assignmentList[index] = { ...assignment, translateX };

    this.setData({
      assignmentList,
      currentIndex: translateX < -50 ? index : -1,
      isTouching: false,
    });
  },

  /** 删除作业 */
  async onDeleteAssignment(e) {
    const { assignmentId, index } = e.currentTarget.dataset;
    const assignment = this.data.assignmentList[index];
    if (!assignment) return;

    // 确认删除
    const res = await wx.showModal({
      title: '提示',
      content: '确定要删除这个作业吗？删除后将无法恢复。',
      confirmText: '删除',
      confirmColor: '#ff4757',
    });

    if (!res.confirm) {
      // 取消删除，恢复滑动状态
      this.setData({ currentIndex: -1 });
      return;
    }

    wx.showLoading({ title: '删除中...' });

    try {
      const cloudRes = await wx.cloud.callFunction({
        name: 'deleteAssignment',
        data: {
          assignmentId: assignmentId,
        },
      });

      if (!cloudRes || !cloudRes.result) {
        throw { message: '云函数调用失败', data: cloudRes };
      }

      const result = cloudRes.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '删除失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success',
      });

      // 关闭滑动状态
      this.setData({ currentIndex: -1 });

      // 重新加载作业列表，确保数据同步
      setTimeout(() => {
        this.loadAssignments(this.data.classId);
      }, 500);
    } catch (error) {
      wx.hideLoading();

      let errorMsg = '删除失败';
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        errorMsg = '云函数未找到，请先上传 deleteAssignment 云函数';
      } else if (error.data?.message) {
        errorMsg = error.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000,
      });

      // 恢复滑动状态
      this.setData({ currentIndex: -1 });
    }
  },

  /** 进入作业详情 */
  goToAssignmentDetail(e) {
    const assignmentId = e.currentTarget.dataset.assignmentId;
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/assignment-detail/index?assignmentId=${assignmentId}&classId=${classId}`,
    });
  },

  /** 进入创建作业页面 */
  goToCreateAssignment() {
    const { classId } = this.data;
    wx.navigateTo({
      url: `/pages/class/assignment-create/index?classId=${classId}`,
    });
  },
});
