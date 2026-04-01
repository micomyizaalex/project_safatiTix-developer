const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const envBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const normalizedBaseUrl = trimTrailingSlash(envBaseUrl || 'http://localhost:5000');

export const API_BASE_URL = normalizedBaseUrl.replace(/\/api$/, '');
export const API_URL = `${API_BASE_URL}/api`;
