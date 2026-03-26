const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = 'https://backend-v2-wjcs.onrender.com';
export const API_URL = `${trimTrailingSlash(API_BASE_URL)}/api`;
