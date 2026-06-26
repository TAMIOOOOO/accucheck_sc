import { useMemo, useState, useRef } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const PRINT_STYLES = `
  @page {
    size: A5 landscape;
    margin: 8mm;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .mc-screen-wrapper {
      background: white !important;
      min-height: unset !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .no-print {
      display: none !important;
    }
    #mc-print-root {
      width: 100% !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
    }
    [contenteditable] {
      outline: none !important;
    }
    input[type="date"] {
      -webkit-appearance: none;
      appearance: none;
      outline: none !important;
    }
    input[type="date"]::-webkit-calendar-picker-indicator {
      display: none !important;
    }
    input[type="date"]::-webkit-inner-spin-button,
    input[type="date"]::-webkit-clear-button {
      display: none !important;
    }
  }
`;

const staticBlank: React.CSSProperties = {
  display: "inline-block",
  borderBottom: "1px solid black",
  minWidth: "40px",
  padding: "0 2px",
  verticalAlign: "bottom",
};

const LINE_HEIGHT = 22;

function LinedField({ flex }: { flex?: boolean }) {
  const [lineCount, setLineCount] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  const measure = () => {
    if (ref.current) {
      ref.current.style.height = "auto";
      const lines = Math.max(1, Math.ceil(ref.current.scrollHeight / LINE_HEIGHT));
      ref.current.style.height = `${lines * LINE_HEIGHT}px`;
      setLineCount(lines);
    }
  };

  return (
    <div
      style={{
        flex: flex ? 1 : undefined,
        position: "relative",
        height: `${lineCount * LINE_HEIGHT}px`,
      }}
    >
      {Array.from({ length: lineCount }).map((_, i) => (
        <div
          key={i}
          style={{ height: `${LINE_HEIGHT}px`, borderBottom: "1px solid black" }}
        />
      ))}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={measure}
        style={{
          position: "absolute",
          top: 0,
          left: 2,
          right: 0,
          height: `${lineCount * LINE_HEIGHT}px`,
          lineHeight: `${LINE_HEIGHT}px`,
          outline: "none",
          background: "transparent",
          whiteSpace: "normal",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          cursor: "text",
          overflow: "hidden",
        }}
      />
    </div>
  );
}

export default function MedicalCertificate() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );
  const patientName = params.get("name") ?? "";
  const age = params.get("age") ?? "";

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className="mc-screen-wrapper min-h-screen bg-slate-100 flex flex-col items-center py-10">
        {/* Screen-only controls */}
        <div className="fixed top-4 right-4 flex gap-2 no-print z-50">
          <Button asChild variant="outline" className="bg-white shadow-sm">
            <Link href="/patients">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <Button onClick={() => window.print()} className="bg-primary text-white shadow-sm">
            <Printer className="mr-2 h-4 w-4" /> Print Document
          </Button>
        </div>

        {/* A5 landscape paper */}
        <div
          id="mc-print-root"
          className="bg-white text-black shadow-xl border border-slate-200"
          style={{
            width: "210mm",
            minHeight: "148mm",
            boxSizing: "border-box",
            padding: "8mm 10mm 8mm 10mm",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "0.75rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── TOP HEADER ── logo + clinic info centred as a unit */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "3mm",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "62px",
                  height: "62px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1.5px solid #111",
                  flexShrink: 0,
                }}
              >
                <img
                  src="/AccucheckLogo.png"
                  alt="Accucheck Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                  }}
                />
              </div>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: "1.05rem",
                    letterSpacing: "0.03em",
                    lineHeight: 1.2,
                    fontFamily: "Arial Black, Arial, sans-serif",
                    textTransform: "uppercase",
                  }}
                >
                  ACCUCHECK DIAGNOSTIC CLINIC
                </div>
                <div style={{ fontSize: "0.67rem", marginTop: "3px", lineHeight: 1.5 }}>
                  #41 Gen. Trias St, Brgy. Bagumbayan, General Trias City, Cavite
                </div>
                <div style={{ fontSize: "0.67rem", lineHeight: 1.5 }}>
                  Tel. No. 046-4377880 / Mobile No. 09257814492
                </div>
              </div>
            </div>
          </div>

          {/* ── MEDICAL CERTIFICATE TITLE ── */}
          <div
            style={{
              textAlign: "center",
              fontWeight: 900,
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              marginBottom: "4mm",
              fontFamily: "Arial Black, Arial, sans-serif",
            }}
          >
            MEDICAL CERTIFICATE
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: 1, lineHeight: 1.9, fontSize: "0.75rem" }}>
            {/* "To whom it may concern," */}
            <div style={{ marginBottom: "1mm" }}>
              To whom it may concern,
            </div>

            {/* Certify line — name, age, date */}
            <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: "3px", marginBottom: "1mm" }}>
              <span style={{ whiteSpace: "nowrap", marginLeft: "12mm" }}>
                This is to certify that Mr. / Ms / Mrs
              </span>
              <span style={{ ...staticBlank, minWidth: "20px" }}>
                {patientName}
              </span>
              <span>,</span>
              <span style={{ ...staticBlank, minWidth: "24px", textAlign: "center" }}>
                {age}
              </span>
              <span style={{ whiteSpace: "nowrap" }}>years old</span>
              <span style={{ whiteSpace: "nowrap" }}>sought consultation on</span>
              <input
                type="date"
                style={{
                  border: "none",
                  borderBottom: "1px solid black",
                  background: "transparent",
                  outline: "none",
                  fontSize: "inherit",
                  fontFamily: "inherit",
                  verticalAlign: "bottom",
                  cursor: "pointer",
                  padding: "0 2px",
                  minWidth: "100px",
                }}
              />
            </div>

            {/* "due to" — own row with dynamic LinedField */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", marginBottom: "1mm" }}>
              <span style={{ whiteSpace: "nowrap", lineHeight: `${LINE_HEIGHT}px` }}>due to</span>
              <LinedField flex />
            </div>

            {/* Diagnosis */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", marginBottom: "1mm", flexWrap: "nowrap" }}>
              <span style={{ whiteSpace: "nowrap", lineHeight: `${LINE_HEIGHT}px` }}>Diagnosis: </span>
              <LinedField flex />
            </div>

            {/* Recommendation */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", flexWrap: "nowrap" }}>
              <span style={{ whiteSpace: "nowrap", lineHeight: `${LINE_HEIGHT}px` }}>Recommendation: </span>
              <LinedField flex />
            </div>
          </div>

          {/* ── DOCTOR CREDENTIALS (bottom-right) with signature line above ── */}
          <div
            style={{
              marginTop: "4mm",
              fontSize: "0.7rem",
              lineHeight: 1.6,
              width: "55mm",
              marginLeft: "auto",
            }}
          >
            <div
              style={{
                borderBottom: "1px solid black",
                marginBottom: "2px",
              }}
            />
            <div style={{ textAlign: "right" }}>Angelita San Gabriel - Soberano, M.D</div>
            <div style={{ textAlign: "center" }}>Internal Medicine</div>
            <div style={{ textAlign: "center" }}>License # 73885</div>
          </div>
        </div>

        <p className="mt-4 text-slate-400 text-sm no-print">
          Fill in the blanks above, then click "Print Document" to print on A5 landscape paper.
        </p>
      </div>
    </>
  );
}
