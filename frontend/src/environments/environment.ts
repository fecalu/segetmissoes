interface RuntimeEnvironment {
  apiBaseUrl?: string;
  uploadBaseUrl?: string;
}

const runtimeEnvironment =
  typeof window !== 'undefined'
    ? (window as Window & { __env?: RuntimeEnvironment }).__env
    : undefined;

const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const browserHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const backendPort = '8080';

const defaultApiOrigin = `${browserProtocol}//${browserHostname}:${backendPort}`;
const defaultApiBaseUrl = `${defaultApiOrigin}/api`;

const apiBaseUrl = removeTrailingSlash(runtimeEnvironment?.apiBaseUrl || defaultApiBaseUrl);
const uploadBaseUrl = removeTrailingSlash(
  runtimeEnvironment?.uploadBaseUrl || apiBaseUrl.replace(/\/api$/, '')
);

function removeTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export const environment = {
  production: false,
  apiOrigin: uploadBaseUrl,
  apiBaseUrl,
  uploadBaseUrl
};
