const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = 'http://localhost:5000';
export const API_URL = `${trimTrailingSlash(API_BASE_URL)}/api`;
