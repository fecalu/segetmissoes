const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const browserHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const backendPort = '8080';
const apiOrigin = `${browserProtocol}//${browserHostname}:${backendPort}`;

export const environment = {
  production: false,
  apiOrigin,
  apiBaseUrl: `${apiOrigin}/api`,
  uploadBaseUrl: apiOrigin
};
