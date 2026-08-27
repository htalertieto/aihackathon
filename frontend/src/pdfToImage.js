import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const RENDER_SCALE = 1.5;

export async function convertPdfToPng(file) {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

  try {
    const pages = [];
    let width = 0;
    let height = 0;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      pages.push({ page, viewport });
      width = Math.max(width, Math.ceil(viewport.width));
      height += Math.ceil(viewport.height);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create an image canvas for this PDF.');

    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    let offsetY = 0;
    for (const { page, viewport } of pages) {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = Math.ceil(viewport.width);
      pageCanvas.height = Math.ceil(viewport.height);
      const pageContext = pageCanvas.getContext('2d');
      if (!pageContext) throw new Error('Could not render a PDF page.');

      await page.render({ canvasContext: pageContext, viewport }).promise;
      context.drawImage(pageCanvas, 0, offsetY);
      offsetY += pageCanvas.height;
    }

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((imageBlob) => {
        if (imageBlob) resolve(imageBlob);
        else reject(new Error('Could not convert the PDF into an image.'));
      }, 'image/png');
    });

    const baseName = file.name.replace(/\.pdf$/i, '') || 'medical-report';
    return new File([blob], `${baseName}.png`, { type: 'image/png' });
  } finally {
    await pdf.destroy();
  }
}
