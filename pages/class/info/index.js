// pages/class/info/index.js
import { encryptFields } from '~/utils/crypto';

Page({
  data: {
    classId: null,
    classInfo: {},
    isAdmin: false,
    isEditing: false,
    editForm: {
      name: '',
      semester: '',
      teacherName: '',
    },
  },

  onLoad(options) {
    // 兼容多种入参：classId / id
    const classId = options.classId || options.id;
    console.log('[课程信息] onLoad, classId:', classId);
    if (classId) {
      // 云数据库 _id 是字符串，不要 parseInt，否则会变 NaN
      this.setData({ classId: String(classId) });
      this.loadClassInfo(String(classId));
      this.checkAdminStatus(String(classId));
    } else {
      console.error('[课程信息] 缺少 classId 参数');
      wx.showToast({ title: '课程id不能为空', icon: 'none' });
    }
  },

  /** 加载课程信息 */
  async loadClassInfo(classId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getClassDetail',
        data: {
          classId: classId,
        },
      });
      
      const result = res.result || {};
      if (result.code !== 200) {
        throw { message: result.message || '加载失败', data: result };
      }
      
      const classInfo = result.data || {};
      console.log('[课程信息] 加载成功:', classInfo);
      this.setData({
        classInfo: {
          id: classInfo.id || classInfo._id,
          name: classInfo.name || '',
          semester: classInfo.semester || '',
          teacherName: classInfo.teacherName || '',
          classCode: classInfo.classCode || '',
        },
        editForm: {
          name: classInfo.name || '',
          semester: classInfo.semester || '',
          teacherName: classInfo.teacherName || '',
        },
      });
      wx.hideLoading();
    } catch (error) {
      console.error('[课程信息] 加载失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.data?.message || error.message || '加载失败',
        icon: 'none',
      });
    }
  },

  /** 检查管理员状态 */
  async checkAdminStatus(classId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdminStatus',
        data: {
          classId: classId,
        },
      });
      
      const result = res.result || {};
      const isAdmin = result.data?.isAdmin || false;
      console.log('[课程信息] checkAdminStatus 结果:', { result, isAdmin });
      this.setData({ isAdmin });
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      // 默认不是管理员
      this.setData({ isAdmin: false });
    }
  },

  /** 开始编辑 */
  startEdit() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限修改',
        icon: 'none',
      });
      return;
    }

    this.setData({
      isEditing: true,
    });
  },

  /** 取消编辑 */
  cancelEdit() {
    // 恢复原始数据
    const { classInfo } = this.data;
    this.setData({
      isEditing: false,
      editForm: {
        name: classInfo.name || '',
        semester: classInfo.semester || '',
        teacherName: classInfo.teacherName || '',
      },
    });
  },

  /** 保存编辑 */
  async saveEdit() {
    const { editForm, classId } = this.data;

    if (!editForm.name.trim() || !editForm.semester.trim() || !editForm.teacherName.trim()) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 对敏感信息进行AES加密（老师姓名）
      const plainPayload = {
        classId: classId,
        name: editForm.name.trim(),
        semester: editForm.semester.trim(),
        teacherName: editForm.teacherName.trim(),
      };
      console.log('[课程信息] saveEdit 明文提交:', plainPayload);

      const encryptedData = await encryptFields(
        {
          ...plainPayload,
        },
        ['teacherName'], // 只加密老师姓名
      );
      console.log('[课程信息] saveEdit 加密后提交:', encryptedData);
      
      // 调用云函数更新课程信息
      const res = await wx.cloud.callFunction({
        name: 'updateClass',
        data: encryptedData,
      });
      
      const result = res.result || {};
      console.log('[课程信息] saveEdit 云函数返回:', result);
      if (result.code !== 200) {
        throw { message: result.message || '保存失败', data: result };
      }

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
      });

      // 重新加载课程信息
      await this.loadClassInfo(classId);
      this.setData({
        isEditing: false,
      });
    } catch (error) {
      wx.hideLoading();
      const errorMessage = error.data?.message || error.message || '保存失败';
      wx.showToast({
        title: errorMessage,
        icon: 'none',
      });
    }
  },

  /** 输入处理 */
  _getInputValue(e) {
    // tdesign-miniprogram 的 t-input bindchange 通常是 e.detail.value
    // 也兼容 e.detail 直接是字符串的情况
    return e?.detail?.value ?? e?.detail ?? '';
  },

  onNameInput(e) {
    this.setData({
      'editForm.name': this._getInputValue(e),
    });
  },

  onSemesterInput(e) {
    this.setData({
      'editForm.semester': this._getInputValue(e),
    });
  },

  onTeacherNameInput(e) {
    this.setData({
      'editForm.teacherName': this._getInputValue(e),
    });
  },

  /** 隐藏课程 */
  hideClass() {
    const { classId } = this.data;
    
    wx.showModal({
      title: '隐藏课程',
      content: '确定要隐藏该课程吗？隐藏后可在"隐藏课程"中查看。',
      success: (res) => {
        if (res.confirm) {
          // 获取当前隐藏的课程ID列表
          const hiddenClassIds = wx.getStorageSync('hiddenClassIds') || [];
          
          // 如果还没有隐藏，添加到列表
          if (!hiddenClassIds.includes(classId)) {
            hiddenClassIds.push(classId);
            wx.setStorageSync('hiddenClassIds', hiddenClassIds);
          }
          
          wx.showToast({
            title: '已隐藏课程',
            icon: 'success',
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      },
    });
  },

  /** 退出课程 */
  async exitClass() {
    wx.showModal({
      title: '退出课程',
      content: '确定要退出该课程吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' });
          
          try {
            const { classId } = this.data;
            
            // 调用云函数退出课程
            const res = await wx.cloud.callFunction({
              name: 'exitClass',
              data: {
                classId: classId,
              },
            });
            
            const result = res.result || {};
            if (result.code !== 200) {
              throw { message: result.message || '退出失败', data: result };
            }
            
            wx.hideLoading();
            wx.showToast({
              title: '已退出课程',
              icon: 'success',
            });
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (error) {
            wx.hideLoading();
            const errorMessage = error.data?.message || error.message || '退出失败';
            wx.showToast({
              title: errorMessage,
              icon: 'none',
            });
          }
        }
      },
    });
  },
});
