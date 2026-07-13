import config from '../config';

const absoluteUrlPattern = /^(?:[a-z][a-z\d+.-]*:)?\/\//i;
const inlineUrlPattern = /^(?:data|blob):/i;

export const getAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  const value = url.trim();
  if (!value) return '';
  if (inlineUrlPattern.test(value) || absoluteUrlPattern.test(value)) return value;
  if (!value.startsWith('/')) return value;

  const apiUrl = config.apiUrl || '';
  if (!apiUrl || apiUrl.startsWith('/')) return value;

  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const apiBase = new URL(apiUrl, currentOrigin);
    const apiPath = apiBase.pathname.replace(/\/api\/?$/i, '').replace(/\/$/, '');
    return `${apiBase.origin}${apiPath}${value}`;
  } catch {
    return value;
  }
};

export const getMainImageUrl = (images = []) => {
  if (!Array.isArray(images) || images.length === 0) return '';

  const mainImage = images.find((image) => image?.isMain) || images[0];
  return getAssetUrl(mainImage?.url);
};
