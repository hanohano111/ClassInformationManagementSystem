// pages/class/course/index.js
import request from '~/api/request';
import { generateClassCode } from '~/utils/util';

Page({
  data: {
    classId: null,
    courseId: null,
    classInfo: {},
    courseInfo: {},
    isAdmin: false,
    currentCheckInCode: null, // 当前签到码
    checkInCodeExpireTime: null, // 签到码过期时间
  },

  onLoad(options) {
    const { classId, courseId } = options;
    if (classId && courseId) {
      this.setData({ classId, courseId });
      this.loadClassInfo(classId);
      this.loadCourseInfo(courseId);
      this.checkAdminStatus(classId);
    }
  },

  onShow() {
    const { classId, courseId } = this.data;
    if (classId && courseId) {
      this.loadClassInfo(classId);
      this.loadCourseInfo(courseId);
    }
  },

  /** 加载课程信息 */
  async loadClassInfo(classId) {
    try {
      const res = await request(`/api/class/${classId}`, 'GET');
      const classInfo = res.data?.data || res.data || {};
      this.setData({ classInfo });
    } catch (error) {
      console.error('加载课程信息失败:', error);
    }
  },

  /** 加载课程信息 */
  async loadCourseInfo(courseId) {
    try {
      const res = await request(`/api/course/${courseId}`, 'GET');
      const courseInfo = res.data?.data || res.data || {};
      this.setData({ courseInfo });
    } catch (error) {
      console.error('加载课程信息失败:', error);
    }
  },

  /** 检查管理员状态 */
  async checkAdminStatus(classId) {
    try {
      const userId = wx.getStorageSync('userId');
      if (!userId) return;
      
      const res = await request(`/api/class/${classId}/admin/check`, 'GET');
      const isAdmin = res.data?.data?.isAdmin || false;
      this.setData({ isAdmin });
    } catch (error) {
      console.error('检查管理员状态失败:', error);
    }
  },

  /** 进入签到页面 */
  goToAttendance() {
    wx.navigateTo({
      url: `/pages/class/attendance/index?classId=${this.data.classId}&courseId=${this.data.courseId}`,
    });
  },

  /** 进入课程信息页面 */
  goToClassInfo() {
    const classId = this.data.classId;
    wx.navigateTo({
      url: `/pages/class/info/index?classId=${classId}`,
    });
  },

  /** 进入通知页面 */
  goToNotices() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  /** 进入作业页面 */
  goToAssignments() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  /** 进入请假申请页面 */
  goToLeave() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  /** 进入管理员设置页面 */
  goToAdminSettings() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限访问',
        icon: 'none',
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/class/admin/index?classId=${this.data.classId}`,
    });
  },
});
