Component({
  options: {
    styleIsolation: 'shared',
  },
  properties: {
    navType: {
      type: String,
      value: 'title',
    },
    titleText: String,
    sidebar: {
      type: Array,
      value: [],
    },
    drawerTitle: {
      type: String,
      value: '页面目录',
    },
  },
  data: {
    visible: false,
    statusHeight: 0,
    sidebarData: [],
  },
  observers: {
    sidebar: function(newVal) {
      this.setData({ sidebarData: newVal || [] });
    },
  },
  lifetimes: {
    attached() {
      this.setData({ sidebarData: this.properties.sidebar || [] });
    },
    ready() {
      const statusHeight = wx.getWindowInfo().statusBarHeight;
      this.setData({ statusHeight });
    },
  },
  methods: {
    openDrawer() {
      this.setData({
        visible: true,
      });
    },
    itemClick(e) {
      const that = this;
      const item = e.detail.item;
      const { isSidebar, url, type } = item;
      
      // 触发自定义事件，让父组件处理
      this.triggerEvent('sidebar-click', { item });
      
      // 如果有 url，执行默认导航逻辑
      if (url) {
        if (isSidebar) {
          wx.switchTab({
            url: `/${url}`,
          }).then(() => {
            that.setData({
              visible: false,
            });
          });
        } else {
          wx.navigateTo({
            url: `/${url}`,
          }).then(() => {
            that.setData({
              visible: false,
            });
          });
        }
      } else {
        // 没有 url 时，关闭抽屉，由父组件处理
        that.setData({
          visible: false,
        });
      }
    },

    searchTurn() {
      wx.navigateTo({
        url: `/pages/search/index`,
      });
    },
  },
});
