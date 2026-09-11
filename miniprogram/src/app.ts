declare const __PUBLIC_CONFIG__: import('../../packages/contracts/src/config').PublicConfig | null;
App({
  onLaunch() {
    if (__PUBLIC_CONFIG__ && wx.cloud) wx.cloud.init({ env: __PUBLIC_CONFIG__.envId, traceUser: false });
  }
});
