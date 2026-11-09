const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function downloadGoogleProfileImage(pictureUrl) {
  let url;

  try {
    url = new URL(pictureUrl);
  } catch {
    throw new Error('Invalid Google profile image URL.');
  }

  const hostname = url.hostname.toLowerCase();
  const isGoogleImageHost =
    hostname === 'googleusercontent.com' ||
    hostname.endsWith('.googleusercontent.com');

  if (
    url.protocol !== 'https:' ||
    !isGoogleImageHost ||
    url.username ||
    url.password
  ) {
    throw new Error('Untrusted Google profile image URL.');
  }

  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: { Accept: 'image/*' },
  });

  if (!response.ok) {
    throw new Error('Unable to download Google profile image.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error('Google profile URL did not return an image.');
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_IMAGE_SIZE) {
    throw new Error('Google profile image is too large.');
  }

  const chunks = [];
  let totalSize = 0;

  for await (const chunk of response.body) {
    totalSize += chunk.length;

    if (totalSize > MAX_IMAGE_SIZE) {
      throw new Error('Google profile image is too large.');
    }

    chunks.push(chunk);
  }

  if (totalSize === 0) {
    throw new Error('Google profile image is empty.');
  }

  return Buffer.concat(chunks);
}

module.exports = downloadGoogleProfileImage;
