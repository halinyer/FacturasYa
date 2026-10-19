/**
 * Utility for razor-sharp 1:1 thermal printing of tickets and receipts.
 * Isolates the ticket DOM from the main application window so that Chromium's print
 * subsystem does not downscale the page to fit a 1400px/1920px desktop layout into a 58mm roll.
 */

export const getTicketFullHtml = (htmlContent, paperSize = '58mm') => {
  const is58 = paperSize === '58mm' || !paperSize || paperSize === '48mm';
  const widthMm = is58 ? 58 : 80;
  const printableWidth = is58 ? '48mm' : '72mm';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket</title>
<style>
  @page {
    size: ${widthMm}mm auto;
    margin: 0mm !important;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    width: ${printableWidth} !important;
    max-width: ${printableWidth} !important;
    margin: 0 auto !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
    font-family: Arial, Helvetica, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .ticket-paper {
    width: 100% !important;
    max-width: ${printableWidth} !important;
    margin: 0 auto !important;
    padding: 0 1mm !important;
    box-sizing: border-box !important;
    font-size: ${is58 ? '9.5px' : '10.5px'} !important;
    line-height: 1.25 !important;
    font-weight: 400 !important;
    color: #000000 !important;
    background: #ffffff !important;
    font-family: Arial, Helvetica, sans-serif !important;
  }
  .ticket-center { text-align: center !important; }
  .ticket-right { text-align: right !important; }
  .ticket-bold { font-weight: 600 !important; }
  .ticket-divider { border-top: 1px dashed #000000 !important; margin: 3px 0 !important; }
  .ticket-double-divider { border-top: 1px dashed #000000 !important; margin: 4px 0 !important; }
  .k-center { text-align: center !important; }
  .k-bold { font-weight: 700 !important; }
  .k-divider { border-top: 1px dashed #000000 !important; margin: 3px 0 !important; }
  .k-double-divider { border-top: 1px dashed #000000 !important; margin: 4px 0 !important; }
  .kitchen-paper {
    width: 100% !important;
    max-width: ${printableWidth} !important;
    box-sizing: border-box !important;
    font-family: Arial, Helvetica, sans-serif !important;
    font-size: ${is58 ? '10px' : '11.5px'} !important;
    line-height: 1.15 !important;
    color: #000000 !important;
    background: #ffffff !important;
    padding: 0 1mm !important;
  }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
};

export const printViaIframe = (fullHtml) => {
  return new Promise((resolve) => {
    let iframe = document.getElementById('print-isolation-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-isolation-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    try {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(fullHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          resolve({ success: true });
        } catch (printErr) {
          console.warn('Iframe print error, falling back to window.print:', printErr);
          window.print();
          resolve({ success: true });
        }
      }, 250);
    } catch (e) {
      console.error('Error writing to print iframe:', e);
      window.print();
      resolve({ success: false, error: e.message });
    }
  });
};

export const printIsolatedTicket = async ({
  html,
  paperSize = '58mm',
  deviceName = '',
  silent = false
}) => {
  if (!html) {
    window.print();
    return { success: true };
  }

  const fullHtml = getTicketFullHtml(html, paperSize);

  if (window.electronAPI && typeof window.electronAPI.printWindow === 'function') {
    try {
      const res = await window.electronAPI.printWindow({
        html,
        paperSize,
        deviceName: deviceName || '',
        silent: !!silent,
        margins: { marginType: 'none' }
      });

      if (res && res.success) {
        return res;
      }
      console.warn('Electron print notice / fallback:', res?.failureReason);
    } catch (e) {
      console.warn('Electron print call failed, attempting browser iframe:', e);
    }
  }

  return printViaIframe(fullHtml);
};
