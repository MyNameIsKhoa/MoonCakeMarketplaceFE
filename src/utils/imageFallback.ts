// Neutral placeholder so a missing/broken image never shows the browser's broken-image icon.
export const IMAGE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
      '<rect width="120" height="120" fill="#eef1f5"/>' +
      '<circle cx="60" cy="54" r="22" fill="#d9dee6"/>' +
      '<rect x="30" y="86" width="60" height="8" rx="4" fill="#d9dee6"/>' +
      '</svg>'
  );

export function installImageFallback() {
  document.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement && target.src !== IMAGE_FALLBACK) {
        target.src = IMAGE_FALLBACK;
      }
    },
    true
  );
}
