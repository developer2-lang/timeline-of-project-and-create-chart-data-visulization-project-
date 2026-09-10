import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MM_PER_PX = 25.4 / 96;
const PAGE_W_MM = 297;
const PAGE_H_MM = 210;
const MARGIN_MM = 11;

/** Printable A4-landscape area in CSS pixels at 96dpi (~ 1039 x 710). */
const BOX_W_PX = (PAGE_W_MM - MARGIN_MM * 2) / MM_PER_PX;
const BOX_H_PX = (PAGE_H_MM - MARGIN_MM * 2) / MM_PER_PX;

/**
 * Rasterise `el` (the dedicated export sheet) and save it as an A4-landscape
 * PDF. The sheet is scaled proportionally so the whole timeline always fits
 * onto one page and nothing is cut off.
 */
export async function generateTimelinePdf(
  el: HTMLElement,
  _fileName: string,
  title: string
): Promise<Blob> {
  if (document.fonts?.ready) await document.fonts.ready;

  const elW = Math.max(el.offsetWidth, 1);
  const elH = Math.max(el.offsetHeight, 1);
  const rect = el.getBoundingClientRect();
  const fit = Math.min(BOX_W_PX / elW, BOX_H_PX / elH);

  const canvas = await html2canvas(el, {
    scale: Math.max(fit * 2, 0.25),
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: Math.max(window.innerWidth, Math.ceil(rect.right)),
    windowHeight: Math.max(window.innerHeight, Math.ceil(rect.bottom)),
  });

  const ratio = canvas.width / canvas.height;
  const boxW = PAGE_W_MM - MARGIN_MM * 2;
  const boxH = PAGE_H_MM - MARGIN_MM * 2;

  let cw = boxW;
  let ch = cw / ratio;
  if (ch > boxH) {
    ch = boxH;
    cw = ch * ratio;
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  pdf.setProperties({ title });
  pdf.addImage(
    canvas,
    'PNG',
    MARGIN_MM + (boxW - cw) / 2,
    MARGIN_MM + (boxH - ch) / 2,
    cw,
    ch
  );
  return pdf.output('blob');
}

/** Strip characters that are invalid in file names. */
export function sanitiseFileName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'timeline'
  );
}