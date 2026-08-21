import { jsPDF } from "jspdf";
import { AuditResult } from "../types";

export function generateAuditPdf(result: AuditResult) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [225, 29, 72]; // Rose 600
  const warningColor = [234, 88, 12]; // Amber 600
  const successColor = [16, 185, 129]; // Emerald 500
  const textDark = [30, 41, 59];
  const textMuted = [100, 116, 139];

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 38, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("LEADGUARD OS", 15, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text("Revenue Leakage & Lead Channel Forensic Audit Report", 15, 26);
  doc.text(`Generated: ${new Date(result.scannedAt).toLocaleString()}`, 130, 26);

  // Target Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, 45, 180, 28, 3, 3, "F");

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("AUDITED DOMAIN:", 22, 54);
  doc.setTextColor(37, 99, 235);
  doc.text(result.targetUrl, 68, 54);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Scan ID: ${result.scanId} | Domain: ${result.domain}`, 22, 63);

  // Score & Financial Loss Summary
  // Score Box
  const scoreColor = result.score >= 80 ? successColor : result.score >= 50 ? warningColor : accentColor;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(15, 80, 85, 38, 3, 3, "FD");

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LEAD CAPTURE HEALTH SCORE", 20, 90);

  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`${result.score}/100`, 20, 105);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(result.score >= 80 ? "Healthy Funnel" : "Critical Leaks Detected", 58, 105);

  // Monthly Loss Box
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(110, 80, 85, 38, 3, 3, "FD");

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATED MONTHLY LOSS", 115, 90);

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`INR ${result.estimatedMonthlyLoss.toLocaleString('en-IN')}`, 115, 105);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Risk: ${result.adSpendRisk} Ad Waste`, 115, 112);

  // Diagnostic Overview
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE DIAGNOSTIC SUMMARY", 15, 130);

  doc.setFillColor(248, 250, 252);
  doc.rect(15, 134, 180, 22, "F");
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const splitSummary = doc.splitTextToSize(result.aiDiagnosticAdvice || "Audit completed across WhatsApp, Click-to-Call, Meta Pixel, and Google SEO channels.", 170);
  doc.text(splitSummary, 20, 142);

  // Channel Breakdown Table
  let yPos = 168;
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CRITICAL CHANNEL VERIFICATION MATRIX", 15, yPos);

  yPos += 8;

  const channels = [
    {
      name: "WhatsApp Click-to-Chat",
      status: result.whatsappLinks.some((w) => !w.isValid) ? "BROKEN (+9191 / invalid format)" : (result.whatsappLinks.length ? "VERIFIED (100% Active)" : "MISSING"),
      risk: result.whatsappLinks.some((w) => !w.isValid) ? "CRITICAL" : "NORMAL",
    },
    {
      name: "Click-to-Call (tel: links)",
      status: result.phoneLinks.some((p) => !p.isValid) ? "INVALID NUMBER LENGTH" : (result.phoneLinks.length ? "VERIFIED" : "NONE FOUND"),
      risk: result.phoneLinks.some((p) => !p.isValid) ? "HIGH" : "NORMAL",
    },
    {
      name: "Meta Pixel (fbq)",
      status: result.metaPixel.exists ? `ACTIVE (ID: ${result.metaPixel.pixelId || "Detected"})` : "MISSING (Ad Budget Bleed)",
      risk: result.metaPixel.exists ? "NORMAL" : "HIGH",
    },
    {
      name: "Google Tag / GA4",
      status: result.googleTag.exists ? `ACTIVE (ID: ${result.googleTag.tagId || "Detected"})` : "MISSING (No GA4 Tag)",
      risk: result.googleTag.exists ? "NORMAL" : "MEDIUM",
    },
    {
      name: "Google SEO Indexability",
      status: result.seoPenalty.hasNoIndex ? "BLOCKED BY NOINDEX META TAG" : "INDEXABLE BY GOOGLE",
      risk: result.seoPenalty.hasNoIndex ? "CRITICAL" : "NORMAL",
    },
  ];

  for (const ch of channels) {
    doc.setFillColor(ch.risk === "CRITICAL" ? 254 : ch.risk === "HIGH" ? 255 : 241, ch.risk === "CRITICAL" ? 242 : ch.risk === "HIGH" ? 247 : 245, ch.risk === "CRITICAL" ? 242 : ch.risk === "HIGH" ? 237 : 249);
    doc.roundedRect(15, yPos, 180, 11, 1.5, 1.5, "F");

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(ch.name, 20, yPos + 7);

    if (ch.risk === "CRITICAL" || ch.risk === "HIGH") {
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    } else {
      doc.setTextColor(successColor[0], successColor[1], successColor[2]);
    }
    doc.text(ch.status, 90, yPos + 7);
    yPos += 14;
  }

  // Footer / Watermark
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 275, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Generated by LeadGuard OS - The #1 Revenue & Ad Shield for Businesses", 15, 285);
  doc.text("Page 1 of 1 • Confidential Audit Document", 140, 285);

  doc.save(`LeadGuard_Audit_${result.domain}_${Date.now()}.pdf`);
}
