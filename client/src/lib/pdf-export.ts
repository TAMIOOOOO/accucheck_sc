import jsPDF from "jspdf";
import autoTable, { type RowInput, type CellDef, type FontStyle } from "jspdf-autotable";
import { differenceInYears } from "date-fns";
import { formatPHDate, formatPHDateTime } from "@/lib/ph-time";
import type { Patient, Consultation } from "@shared/schema";
import type { LabResultFull } from "@/hooks/use-lab-results";

const CLINIC_NAME = "Accucheck Diagnostic Clinic";
const PRIMARY_COLOR: [number, number, number] = [30, 100, 200];
const GREY: [number, number, number] = [100, 100, 100];
const LIGHT_GREY: [number, number, number] = [230, 230, 230];

function detectImageFormat(dataUri: string): string {
  if (dataUri.startsWith("data:image/png")) return "PNG";
  if (dataUri.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function parsePSH(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const psh = JSON.parse(raw);
    const parts: string[] = [];
    if (psh.smoker) {
      let s = "Smoker";
      const details: string[] = [];
      if (psh.sticksPerDay) details.push(`${psh.sticksPerDay} sticks/day`);
      if (psh.smokingYears) details.push(`${psh.smokingYears} years`);
      if (details.length) s += `: ${details.join(", ")}`;
      parts.push(s);
    }
    if (psh.drinker) {
      let d = "Alcoholic drinker";
      const details: string[] = [];
      if (psh.drinkingFrequency) details.push(psh.drinkingFrequency);
      if (psh.bottlesPerBinge) details.push(`${psh.bottlesPerBinge} bottles/session`);
      if (details.length) d += `: ${details.join(", ")}`;
      parts.push(d);
    }
    return parts.join("; ") || "";
  } catch {
    return raw;
  }
}

function parseMeds(prescription: string): { name: string; dosage: string; qty: string }[] {
  try {
    const meds = JSON.parse(prescription);
    if (Array.isArray(meds)) return meds;
  } catch {
    // fall through
  }
  return [{ name: prescription, dosage: "", qty: "" }];
}

function addPageHeader(doc: jsPDF) {
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, doc.internal.pageSize.width, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(CLINIC_NAME, 10, 9);
  doc.setTextColor(0, 0, 0);
}

function boldCell(content: string): CellDef {
  return { content, styles: { fontStyle: "bold" as FontStyle, fontSize: 7, textColor: [80, 80, 80] } };
}

function dataCell(content: string, extraStyles: Record<string, unknown> = {}): CellDef {
  return { content, styles: { fontSize: 7, ...extraStyles } };
}

function addPatientSection(
  doc: jsPDF,
  patient: Patient,
  consultations: Consultation[],
  isFirst: boolean,
  labResults: LabResultFull[] = []
) {
  const pageW = doc.internal.pageSize.width;

  if (!isFirst) {
    doc.addPage();
  }

  addPageHeader(doc);

  let y = 22;

  if (patient.photo) {
    try {
      const fmt = detectImageFormat(patient.photo);
      doc.addImage(patient.photo, fmt, 10, y, 28, 28);
    } catch {
      // skip photo if embedding fails
    }
  }

  const infoX = patient.photo ? 42 : 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(patient.name, infoX, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);

  const age = differenceInYears(new Date(), new Date(patient.birthdate));
  const line1 = `ID: ${patient.patientId}  |  ${age} y/o, ${patient.gender}  |  Born: ${formatPHDate(patient.birthdate)}`;
  const line2 = `Contact: ${patient.contact}`;
  const line3 = `Address: ${patient.address}`;
  doc.text(line1, infoX, y + 13);
  doc.text(line2, infoX, y + 19);
  doc.text(line3, infoX, y + 25);

  y += 36;

  doc.setDrawColor(...LIGHT_GREY);
  doc.line(10, y, pageW - 10, y);
  y += 5;

  const kv = (label: string, value: string | null | undefined) => {
    if (!value) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(label + ":", 10, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(value, pageW - 55);
    doc.text(lines, 45, y);
    y += lines.length * 4.5 + 1;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("MEDICAL ALERTS", 10, y);
  y += 5;

  kv("Allergies", patient.allergies || "None reported");
  kv("Existing Conditions", patient.existingConditions || "None reported");
  y += 2;

  const psh = parsePSH(patient.personalSocialHistory);
  if (patient.familyHistory || patient.pastMedicalHistory || psh) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text("PATIENT HISTORY", 10, y);
    y += 5;

    kv("Family History", patient.familyHistory);
    kv("Past Medical History", patient.pastMedicalHistory);
    kv("Social History", psh || undefined);
    y += 2;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("CONSULTATION HISTORY", 10, y);
  y += 3;

  if (!consultations || consultations.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text("No consultations recorded.", 10, y + 4);
    return;
  }

  for (const consult of consultations) {
    const meds = parseMeds(consult.prescription);
    const dateStr = consult.date ? formatPHDateTime(consult.date) : "—";
    const followUp = consult.followUpDate ? formatPHDateTime(consult.followUpDate) : "—";

    const vitals: string[] = [];
    if (consult.weight) vitals.push(`Wt: ${consult.weight}`);
    if (consult.bloodPressure) vitals.push(`BP: ${consult.bloodPressure}`);
    if (consult.pulseRate) vitals.push(`PR: ${consult.pulseRate}`);
    if (consult.temperature) vitals.push(`Temp: ${consult.temperature}`);

    const consultLabs = consult.queueEntryId
      ? labResults.filter((lr) => lr.queueEntryId === consult.queueEntryId)
      : [];
    const consultLabImages = consultLabs.filter((lr) => lr.mimeType.startsWith("image/"));
    const consultLabPdfs = consultLabs.filter((lr) => lr.mimeType === "application/pdf");

    const headerRow: RowInput = [
      { content: `${dateStr}  —  Dx: ${consult.diagnosis}`, colSpan: 3, styles: { fillColor: [240, 245, 255] as [number, number, number], textColor: [30, 30, 30] as [number, number, number], fontStyle: "bold" as FontStyle, fontSize: 8 } },
    ];

    const tableBody: RowInput[] = [
      ...(vitals.length > 0
        ? [[boldCell("Vitals"), { ...dataCell(vitals.join("   ")), colSpan: 2 }]]
        : []),
      [boldCell("Symptoms"), { ...dataCell(consult.symptoms), colSpan: 2 }],
      ...(consult.historyOfPresentIllness
        ? [[boldCell("HPI"), { ...dataCell(consult.historyOfPresentIllness), colSpan: 2 }]]
        : []),
      [boldCell("Medications"), boldCell("Dosage"), boldCell("Qty")],
      ...meds.map((m): RowInput => [m.name, m.dosage, m.qty]),
      ...(consult.notes
        ? [[boldCell("Notes"), { content: consult.notes, colSpan: 2, styles: { fontSize: 7, fontStyle: "italic" as FontStyle } }]]
        : []),
      [boldCell("Follow-up"), { ...dataCell(followUp), colSpan: 2 }],
      ...(consultLabPdfs.length > 0
        ? [[boldCell("Lab PDFs"), { ...dataCell(consultLabPdfs.map((lr) => lr.filename).join(", ")), colSpan: 2 }]]
        : []),
    ];

    autoTable(doc, {
      startY: y,
      head: [headerRow],
      body: tableBody,
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 15 } },
      margin: { left: 10, right: 10 },
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      tableLineColor: LIGHT_GREY,
      tableLineWidth: 0.1,
      didDrawPage: () => { addPageHeader(doc); },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    // Embed image lab result thumbnails (max 40mm tall, max 3 per row)
    if (consultLabImages.length > 0) {
      const thumbW = 55;
      const thumbH = 40;
      const gap = 4;
      const marginL = 10;
      const pageW2 = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;

      if (y + thumbH + 10 > pageH - 10) {
        doc.addPage();
        addPageHeader(doc);
        y = 22;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text("Lab Images:", marginL, y + 4);
      y += 8;

      let imgX = marginL;
      let rowMaxH = 0;

      for (const lr of consultLabImages) {
        if (!lr.data) continue;
        // Start a new row if this image would overflow the page width
        if (imgX + thumbW > pageW2 - 10) {
          imgX = marginL;
          y += rowMaxH + gap;
          rowMaxH = 0;
        }
        // Start a new page if this thumbnail row would overflow the page
        if (y + thumbH + 10 > pageH - 10) {
          doc.addPage();
          addPageHeader(doc);
          y = 22;
          imgX = marginL;
        }
        try {
          const fmt = detectImageFormat(lr.data);
          doc.addImage(lr.data, fmt, imgX, y, thumbW, thumbH, undefined, "FAST");
        } catch {
          // skip corrupt image
        }
        // Filename caption below thumbnail
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...GREY);
        const caption = doc.splitTextToSize(lr.filename, thumbW);
        doc.text(caption, imgX, y + thumbH + 3);

        imgX += thumbW + gap;
        if (thumbH > rowMaxH) rowMaxH = thumbH;
      }

      y += rowMaxH + 10;
    }
  }
}

export function generatePatientPDF(
  patient: Patient,
  consultations: Consultation[],
  labResults: LabResultFull[] = []
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addPatientSection(doc, patient, consultations, true, labResults);
  return doc;
}

export async function generateAllPatientsPDF(
  patients: Patient[],
  fetchConsultations: (patientId: number) => Promise<Consultation[]>,
  fetchLabResults?: (patientId: number) => Promise<LabResultFull[]>
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    const consultations = await fetchConsultations(patient.id);
    const labResults = fetchLabResults ? await fetchLabResults(patient.id) : [];
    addPatientSection(doc, patient, consultations, i === 0, labResults);
  }

  return doc;
}
