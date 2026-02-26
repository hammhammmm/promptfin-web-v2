type ExportOptions = {
  fileName: string;
  pixelRatio?: number;
};

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

function inlineComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  let styleText = "";
  for (const prop of computed) {
    styleText += `${prop}:${computed.getPropertyValue(prop)};`;
  }
  target.setAttribute("style", styleText);

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let i = 0; i < sourceChildren.length; i += 1) {
    const sourceChild = sourceChildren[i];
    const targetChild = targetChildren[i];
    if (sourceChild && targetChild) {
      inlineComputedStyles(sourceChild, targetChild);
    }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Cannot convert image blob"));
    };
    reader.onerror = () => reject(new Error("Cannot read image blob"));
    reader.readAsDataURL(blob);
  });
}

async function inlineImageSources(source: HTMLElement, target: HTMLElement) {
  const sourceImages = Array.from(source.querySelectorAll("img"));
  const targetImages = Array.from(target.querySelectorAll("img"));

  await Promise.all(
    targetImages.map(async (targetImg, index) => {
      const sourceImg = sourceImages[index];
      const src =
        sourceImg?.currentSrc ||
        sourceImg?.src ||
        targetImg.getAttribute("src") ||
        "";
      if (!src) {
        targetImg.setAttribute("src", TRANSPARENT_PIXEL);
        targetImg.removeAttribute("srcset");
        return;
      }

      try {
        const resp = await fetch(src, {
          mode: "cors",
          credentials: "include",
        });
        if (!resp.ok) {
          throw new Error(`Image fetch failed (${resp.status})`);
        }
        const blob = await resp.blob();
        const dataUrl = await blobToDataUrl(blob);
        targetImg.setAttribute("src", dataUrl);
      } catch {
        // Prevent tainting by dropping image source if we cannot inline it.
        targetImg.setAttribute("src", TRANSPARENT_PIXEL);
      } finally {
        targetImg.removeAttribute("srcset");
      }
    }),
  );
}

async function renderElementToCanvas(element: HTMLElement, pixelRatio: number) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const clone = element.cloneNode(true) as HTMLElement;

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  inlineComputedStyles(element, clone);
  await inlineImageSources(element, clone);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svg], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Cannot render widget image"));
    img.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * pixelRatio));
  canvas.height = Math.max(1, Math.ceil(height * pixelRatio));
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(svgUrl);
    throw new Error("Cannot initialize canvas context");
  }

  context.scale(pixelRatio, pixelRatio);
  context.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(svgUrl);
  return canvas;
}

function assertCanvasReadable(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot initialize canvas context");
  context.getImageData(0, 0, 1, 1);
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve, reject) => {
    try {
      canvas.toBlob((result) => resolve(result), "image/png", 1);
    } catch (error) {
      reject(error);
    }
  });
}

async function captureElementFromDisplayMedia(element: HTMLElement): Promise<Blob> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    await new Promise<void>((resolve) => {
      if (video.readyState >= 2) resolve();
      else video.onloadedmetadata = () => resolve();
    });

    const rect = element.getBoundingClientRect();
    const frameWidth = video.videoWidth;
    const frameHeight = video.videoHeight;
    const scaleX = frameWidth / window.innerWidth;
    const scaleY = frameHeight / window.innerHeight;

    const sx = Math.max(0, Math.floor(rect.left * scaleX));
    const sy = Math.max(0, Math.floor(rect.top * scaleY));
    const sw = Math.max(1, Math.floor(rect.width * scaleX));
    const sh = Math.max(1, Math.floor(rect.height * scaleY));

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = frameWidth;
    sourceCanvas.height = frameHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    if (!sourceContext) throw new Error("Cannot initialize screen context");
    sourceContext.drawImage(video, 0, 0, frameWidth, frameHeight);

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = sw;
    outputCanvas.height = sh;
    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) throw new Error("Cannot initialize output context");
    outputContext.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob = await canvasToPngBlob(outputCanvas);
    if (!blob) throw new Error("Cannot export captured widget image");
    return blob;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export async function exportWidgetAsPng(
  element: HTMLElement,
  options: ExportOptions,
) {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const pixelRatio =
    options.pixelRatio ?? Math.max(2, window.devicePixelRatio || 1);
  let blob: Blob | null = null;

  try {
    const canvas = await renderElementToCanvas(element, pixelRatio);
    assertCanvasReadable(canvas);
    blob = await canvasToPngBlob(canvas);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Canvas export fallback to display capture", error);
    }
    blob = await captureElementFromDisplayMedia(element);
  }

  if (!blob) throw new Error("Cannot export widget image");

  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = options.fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
