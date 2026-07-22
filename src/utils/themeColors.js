const fallbackTheme = {
  primary: '39 85 62',
  secondary: '205 157 78',
  accent: '173 73 41',
  text: '30 28 22',
  background: '255 250 241'
};

function rgbToString(color) {
  return `${color.r} ${color.g} ${color.b}`;
}

function getBrightness(color) {
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
}

function getDominantColorsFromImage(image) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 80;
  canvas.height = 80;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const colorMap = new Map();

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3];
    if (alpha < 180) continue;

    const r = Math.round(pixels[index] / 24) * 24;
    const g = Math.round(pixels[index + 1] / 24) * 24;
    const b = Math.round(pixels[index + 2] / 24) * 24;
    const brightness = getBrightness({ r, g, b });
    if (brightness < 18 || brightness > 244) continue;

    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  return [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return { r, g, b };
    });
}

export function applyTheme(theme = fallbackTheme) {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}

export function applyThemeFromLogo(logoPath = '/logo.png') {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = logoPath;

  image.onload = () => {
    const colors = getDominantColorsFromImage(image);
    if (!colors.length) {
      applyTheme(fallbackTheme);
      return;
    }

    const sortedByBrightness = [...colors].sort((a, b) => getBrightness(a) - getBrightness(b));
    const primary = sortedByBrightness[0] || colors[0];
    const secondary = colors[1] || { r: 205, g: 157, b: 78 };
    const accent = colors[2] || { r: 173, g: 73, b: 41 };

    applyTheme({
      primary: rgbToString(primary),
      secondary: rgbToString(secondary),
      accent: rgbToString(accent),
      text: rgbToString(primary),
      background: fallbackTheme.background
    });
  };

  image.onerror = () => applyTheme(fallbackTheme);
}
