import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { TimelinePdfSheet } from './components/TimelinePdfSheet';
import { buildDemoProjects } from './data/demoData';
import { fmt, iso, pd } from './utils/dateUtils';
import type { Holiday } from './types/timeline';
import './index.css';

const HOLIDAYS: Holiday[] = [
  { id: 'emis-2026-05-20', date: '2026-05-20', name: 'EMIS' },
];

const SAT_RULE = false;

export default function PdfProbe() {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLPreElement>(null);

  const project = buildDemoProjects(SAT_RULE, HOLIDAYS)[0];

  useEffect(() => {
    if (!started) return;
    const log = (s: string) => {
      logRef.current!.textContent += s + '\n';
    };

    (async () => {
      const sheetEl = ref.current!;
      try {
        log('STEP1: html2canvas with pdfExport options...');
        const rect = sheetEl.getBoundingClientRect();
        const BOX_W_PX = (297 - 22) / (25.4 / 96);
        const BOX_H_PX = (210 - 22) / (25.4 / 96);
        const elW = Math.max(sheetEl.offsetWidth, 1);
        const elH = Math.max(sheetEl.offsetHeight, 1);
        const fit = Math.min(BOX_W_PX / elW, BOX_H_PX / elH);
        const scale = Math.max(fit * 2, 0.25);
        log('DIMS: offsetWidth=' + elW + ' offsetHeight=' + elH + ' rect=' + JSON.stringify({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, w: rect.width, h: rect.height }) + ' fit=' + fit.toFixed(4) + ' scale=' + scale.toFixed(4));
        const canvas = await html2canvas(sheetEl, {
          scale: scale,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: Math.max(window.innerWidth, Math.ceil(rect.right)),
          windowHeight: Math.max(window.innerHeight, Math.ceil(rect.bottom)),
        });
        log('STEP1: OK canvas=' + canvas.width + 'x' + canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        log('STEP2: toDataURL ok len=' + dataUrl.length + ' head=' + dataUrl.slice(0, 30));

        const MM = 25.4 / 96;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
        const ratio = canvas.width / canvas.height;
        const boxW = 297 - 22;
        const boxH = 210 - 22;
        let cw = boxW;
        let ch = cw / ratio;
        if (ch > boxH) { ch = boxH; cw = ch * ratio; }
        pdf.addImage(dataUrl, 'PNG', 11 + (boxW - cw) / 2, 11 + (boxH - ch) / 2, cw, ch);
        log('STEP3: jsPDF addImage ok');
        try {
          pdf.save('probe.pdf');
          log('STEP4: pdf.save ok');
        } catch (e) {
          log('STEP4: pdf.save FAIL ' + String(e));
        }
      } catch (e) {
        log('FAIL: ' + String((e as Error).message));
        log('STACK:\n' + ((e as Error).stack || 'no stack'));
      }
    })();
  }, [started]);

  return (
    <div style={{ fontFamily: 'Arial' }}>
      <button id="go" onClick={() => setStarted(true)}>GO</button>
      <pre id="out" ref={logRef} style={{ background: '#111', color: '#0f0', padding: 10, whiteSpace: 'pre-wrap', minHeight: 200 }} />
      <div id="probe-root" />
      {started &&
        createPortal(
          <div className="pdf-capture">
            <div className="pdf-capture-card">
              <TimelinePdfSheet ref={ref} project={project} holidays={HOLIDAYS} satRule={SAT_RULE} studio={{ line1: 'IUOVA Design Studio · Mumbai', line2: 'hello@iuova.in · +91 98 0000 0000' }} />
            </div>
          </div>,
          document.getElementById('probe-root')!
        )}
      <p>start={fmt(pd(iso(project.startDate)))} project={project.projectName}</p>
    </div>
  );
}