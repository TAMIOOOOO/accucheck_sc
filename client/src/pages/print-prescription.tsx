import { useParams, useSearch } from "wouter";
import { usePatient } from "@/hooks/use-patients";
import { useConsultations } from "@/hooks/use-consultations";
import { differenceInYears } from "date-fns";
import { formatPHDate, formatPHDateTime } from "@/lib/ph-time";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const MIN_ROWS = 6;

const PRINT_STYLES = `
  @page {
    size: A5 portrait;
    margin: 10mm;
  }
  @media print {
    html, body {
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .rx-screen-wrapper {
      display: block !important;
      background: white !important;
      min-height: unset !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .no-print {
      display: none !important;
    }
    #print-root {
      width: 100% !important;
      min-height: 100% !important;
      height: auto !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .rx-content {
      flex: 1 !important;
    }
  }
`;

const PAD = "8mm";

export default function PrintPrescription() {
  const params = useParams();
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);

  const consultationId = Number(params.id);
  const patientId = Number(searchParams.get("patientId"));

  const { data: patient, isLoading: pLoading } = usePatient(patientId);
  const { data: consultations, isLoading: cLoading } = useConsultations(patientId);

  const consultation = consultations?.find((c: any) => c.id === consultationId);

  if (pLoading || cLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!patient || !consultation) return <div className="p-8 text-center text-red-500">Data not found.</div>;

  const age = differenceInYears(new Date(), new Date(patient.birthdate));

  let meds: { name: string; dosage: string; qty: string | number }[] = [];
  try {
    const parsed = JSON.parse(consultation.prescription);
    if (Array.isArray(parsed)) meds = parsed;
  } catch (e) {}

  const empty = { name: "", dosage: "", qty: "" };
  const displayRows = meds.length >= MIN_ROWS
    ? meds
    : Array.from({ length: MIN_ROWS }, (_, i) => meds[i] ?? empty);

  const cellStyle: React.CSSProperties = {
    border: "1px solid black",
    padding: "4px 8px",
    wordBreak: "break-word",
    overflowWrap: "break-word",
    verticalAlign: "middle",
    textAlign: "center",
  };

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className="rx-screen-wrapper min-h-screen bg-slate-100 flex justify-center py-10 font-sans">

        <div className="fixed top-4 right-4 flex gap-2 no-print">
          <Button asChild variant="outline" className="bg-white shadow-sm">
            <Link href={`/patients/${patientId}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile</Link>
          </Button>
          <Button onClick={() => window.print()} className="bg-primary text-white shadow-sm">
            <Printer className="mr-2 h-4 w-4" /> Print Document
          </Button>
        </div>

        <div
          id="print-root"
          className="bg-white text-black shadow-xl border border-slate-200"
          style={{
            width: "148mm",
            height: "210mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {/* Content grows to fill available space, pushing footer down */}
          <div className="rx-content" style={{ flex: 1, padding: PAD, paddingBottom: "4mm" }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "4px" }}>
              <div style={{
                fontSize: "1.05rem", fontWeight: 700,
                fontFamily: "Georgia, serif",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                ACCUCHECK DIAGNOSTIC CLINIC
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, fontFamily: "Georgia, serif", marginTop: "2px" }}>
                Angelita San Gabriel-Soberano, M.D.
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", marginTop: "1px" }}>
                INTERNAL MEDICINE
              </div>
              <div style={{ fontSize: "0.54rem", textAlign: "left", marginTop: "4px", lineHeight: 1.45 }}>
                <div>41 Gen. Trias Street, Barangay Bagumbayan, Gen. Trias City, Cavite</div>
                <div style={{ fontWeight: 700 }}>CLINIC SCHEDULE</div>
                <div>Monday to Friday: 10:00 AM - 12:00 NN</div>
                <div>Tel. No.: (046) 437-7880 ; CP Nos.: 09257814492 / 09437087373 / 09285022957</div>
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: "2.5px solid black", margin: "5px 0" }} />

            {/* Patient Info */}
            <div style={{ fontSize: "0.73rem", marginBottom: "5px" }}>
              <div style={{ display: "flex", gap: "6px", marginBottom: "4px", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
                  <span style={{ whiteSpace: "nowrap", marginRight: "3px" }}>Patient:</span>
                  <span style={{
                    flex: 1,
                    borderBottom: "1px solid black",
                    paddingLeft: "3px",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>{patient.name}</span>
                </div>
                <div style={{ display: "flex", width: "62px", flexShrink: 0, alignItems: "flex-end" }}>
                  <span style={{ marginRight: "3px" }}>Age:</span>
                  <span style={{ flex: 1, borderBottom: "1px solid black", textAlign: "center" }}>{age}</span>
                </div>
                <div style={{ display: "flex", width: "80px", flexShrink: 0, alignItems: "flex-end" }}>
                  <span style={{ marginRight: "3px" }}>Sex:</span>
                  <span style={{ flex: 1, borderBottom: "1px solid black", textAlign: "center" }}>{patient.gender}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flex: 1, alignItems: "flex-start" }}>
                  <span style={{ whiteSpace: "nowrap", marginRight: "3px", lineHeight: "1.4" }}>Address:</span>
                  <span style={{
                    flex: 1,
                    borderBottom: "1px solid black",
                    paddingLeft: "3px",
                    lineHeight: "1.4",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}>{patient.address}</span>
                </div>
                <div style={{ display: "flex", width: "110px", flexShrink: 0, alignItems: "flex-end" }}>
                  <span style={{ marginRight: "3px", whiteSpace: "nowrap" }}>Date:</span>
                  <span style={{ flex: 1, borderBottom: "1px solid black", textAlign: "center", whiteSpace: "nowrap" }}>
                    {formatPHDate(new Date(consultation.date), "short")}
                  </span>
                </div>
              </div>
            </div>

            {/* Rx logo */}
            <img
              src="/rx-logo.png"
              alt="Rx"
              style={{ height: "2.8rem", marginBottom: "3px" }}
            />

            {/* Prescription Table — shows all medicines; minimum 6 empty rows */}
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              fontSize: "0.78rem",
            }}>
              <colgroup>
                <col style={{ width: "55%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...cellStyle, fontWeight: 700, backgroundColor: "#f8fafc", padding: "3px 8px" }}></th>
                  <th style={{ ...cellStyle, fontWeight: 700, backgroundColor: "#f8fafc", textAlign: "center", padding: "3px 8px" }}>Dosage</th>
                  <th style={{ ...cellStyle, fontWeight: 700, backgroundColor: "#f8fafc", textAlign: "center", padding: "3px 8px" }}>QTY</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => (
                  <tr key={i} style={{ height: "32px" }}>
                    <td style={{ ...cellStyle, fontWeight: row.name ? 700 : 400, fontSize: "0.85rem" }}>
                      {row.name}
                    </td>
                    <td style={{ ...cellStyle, fontStyle: row.dosage ? "italic" : "normal" }}>
                      {row.dosage}
                    </td>
                    <td style={{ ...cellStyle, fontWeight: row.qty ? 700 : 400, fontSize: "0.92rem" }}>
                      {row.qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer — normal flow at bottom of flexbox, always pinned */}
          <div
            style={{
              padding: `4mm ${PAD} ${PAD} ${PAD}`,
              fontSize: "0.72rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {/* Follow-up date ON the underline */}
            <div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                <span style={{ whiteSpace: "nowrap" }}>Follow up on:</span>
                <span style={{
                  flex: 1,
                  minWidth: "100px",
                  borderBottom: "1px solid black",
                  textAlign: "center",
                  fontWeight: consultation.followUpDate ? 700 : 400,
                }}>
                  {consultation.followUpDate ? formatPHDateTime(new Date(consultation.followUpDate)) : ""}
                </span>
              </div>
            </div>

            {/* Signature / credentials */}
            <div style={{ width: "155px" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "5px" }}>
                <span style={{ flex: 1, borderBottom: "1px solid black" }}></span>
                <span style={{ fontWeight: 700, marginLeft: "3px", whiteSpace: "nowrap" }}>,M.D.</span>
              </div>
              <div style={{ display: "flex", marginBottom: "4px", alignItems: "center" }}>
                <span style={{ width: "46px" }}>Lic No.</span>
                <span style={{ flex: 1, borderBottom: "1px solid black", textAlign: "center", fontWeight: 700 }}>73885</span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ width: "46px" }}>PTR:</span>
                <span style={{ flex: 1, borderBottom: "1px solid black" }}></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
