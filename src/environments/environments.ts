declare const window: any;

export declare interface BootstrapData {
  firebase: {
    apiKey?: string;
    authDomain?: string,
    databaseURL?: string,
    projectId?: string,
    storageBucket?: string,
    messagingSenderId?: string,
    measurementId?: string,
    appId?: string,
  };
  viewCodeLink?: string;
  viewCodeMessage?: string;
}

const bootstrapData = window['APP_TEMPLATE_BOOTSTRAP'] as BootstrapData;

if (!bootstrapData) {
  window.location.href = '/config.html';
}

export const environment = {
  firebase: {
      ...bootstrapData?.firebase,
  },
  viewCodeLink: bootstrapData?.viewCodeLink || '',
  viewCodeMessage: bootstrapData?.viewCodeMessage || '',
};
