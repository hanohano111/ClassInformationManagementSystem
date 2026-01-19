import { encryptFields } from '~/utils/crypto';

Page({
  data: {
    personInfo: {
      avatar: '',
      image: '',
      name: '',
      studentNo: '',
      college: '',
      major: '',
      phone: '',
    },
  },

  async onLoad() {
    await this.getPersonalInfo();
  },

  async getPersonalInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo',
      });
      const result = res.result || {};
      if (result.code === 200) {
        const info = result.data || {};
        this.setData({
          personInfo: {
            avatar: info.avatar || info.image || '',
            image: info.image || info.avatar || '',
            name: info.name || '',
            studentNo: info.studentNo || '',
            college: info.college || '',
            major: info.major || '',
            phone: info.phone || '',
          },
        });
      }
    } catch (e) {
      console.error('获取个人信息失败：', e);
    }
  },

  personInfoFieldChange(field, e) {
    const { value } = e.detail;
    this.setData({
      [`personInfo.${field}`]: value,
    });
  },

  onNameChange(e) {
    this.personInfoFieldChange('name', e);
  },

  onStudentNoChange(e) {
    this.personInfoFieldChange('studentNo', e);
  },

  onCollegeChange(e) {
    this.personInfoFieldChange('college', e);
  },

  onMajorChange(e) {
    this.personInfoFieldChange('major', e);
  },

  onPhoneChange(e) {
    this.personInfoFieldChange('phone', e);
  },

  onAvatarChange() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        // 先显示临时图片，提升用户体验
        this.setData({
          'personInfo.avatar': tempFilePath,
          'personInfo.image': tempFilePath,
        });

        // 立即上传到云存储
        wx.showLoading({ title: '上传中...', mask: true });
        try {
          // 生成唯一文件名：avatars/{userId}_{timestamp}.jpg
          const userId = wx.getStorageSync('userId') || 'default';
          const timestamp = Date.now();
          const cloudPath = `avatars/${userId}_${timestamp}.jpg`;
          
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
          });

          // 获取云存储 fileID（永久路径）
          const fileID = uploadRes.fileID;
          
          // 更新为云存储路径
          this.setData({
            'personInfo.avatar': fileID,
            'personInfo.image': fileID,
          });

          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success',
            duration: 1500,
          });
        } catch (err) {
          wx.hideLoading();
          console.error('上传头像失败:', err);
          wx.showToast({
            title: '上传失败，请重试',
            icon: 'none',
          });
          // 上传失败时保持临时路径，用户仍可保存（但下次登录会丢失）
        }
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
        });
      },
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  async onSaveInfo() {
    const { personInfo } = this.data;
    let avatar = personInfo.avatar || personInfo.image;

    // 如果头像还是临时路径（不是云存储 fileID），先上传到云存储
    if (avatar && !avatar.startsWith('cloud://')) {
      wx.showLoading({ title: '上传头像中...', mask: true });
      try {
        const userId = wx.getStorageSync('userId') || 'default';
        const timestamp = Date.now();
        const cloudPath = `avatars/${userId}_${timestamp}.jpg`;
        
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: avatar,
        });
        
        avatar = uploadRes.fileID;
        wx.hideLoading();
      } catch (err) {
        wx.hideLoading();
        console.error('上传头像失败:', err);
        wx.showToast({
          title: '头像上传失败，请重试',
          icon: 'none',
        });
        return;
      }
    }

    const payload = {
      avatar: avatar,
      name: personInfo.name,
      studentNo: personInfo.studentNo,
      college: personInfo.college,
      major: personInfo.major,
      phone: personInfo.phone,
    };

    console.log('[编辑资料] 准备保存的数据:', payload);

    try {
      wx.showLoading({ title: '保存中...', mask: true });
      
      // 对所有字段（除了avatar）进行 AES 加密
      const encrypted = await encryptFields(
        payload,
        ['name', 'studentNo', 'college', 'major', 'phone'], // 除了 avatar 外的所有字段都加密
      );

      console.log('[编辑资料] 加密后的数据:', {
        ...encrypted,
        name: encrypted.name ? '[已加密]' : undefined,
        studentNo: encrypted.studentNo ? '[已加密]' : undefined,
        college: encrypted.college ? '[已加密]' : undefined,
        major: encrypted.major ? '[已加密]' : undefined,
        phone: encrypted.phone ? '[已加密]' : undefined,
      });

      const res = await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: encrypted,
      });
      const result = res.result || {};
      
      console.log('[编辑资料] 云函数返回结果:', result);

      wx.hideLoading();

      if (result.code === 200) {
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500,
        });
        
        console.log('[编辑资料] 保存成功，准备触发刷新事件');
        
        // 触发用户信息更新事件，通知其他页面刷新
        const app = getApp();
        if (app && app.eventBus) {
          console.log('[编辑资料] 触发 user-info-updated 事件');
          app.eventBus.emit('user-info-updated');
        } else {
          console.warn('[编辑资料] eventBus 不存在');
        }
        
        // 延迟返回，确保事件已触发
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.message || '保存失败，请重试',
          icon: 'none',
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('保存失败：', e);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      });
    }
  },
});