import { marked } from "marked";

interface PrdSection {
  heading: string;
  content: string;
}

interface PrdData {
  title: string;
  sections: PrdSection[];
}

export function buildMarkdown(prd: PrdData): string {
  let md = `# ${prd.title}\n\n`;
  for (const s of prd.sections) {
    md += `## ${s.heading}\n\n${s.content}\n\n`;
  }
  return md.trim();
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function downloadMarkdown(prd: PrdData): Promise<void> {
  const md = buildMarkdown(prd);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prd.title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadPdf(prd: PrdData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(prd.title, contentWidth);
  for (const line of titleLines) {
    checkPageBreak(8);
    doc.text(line, margin, y);
    y += 8;
  }
  y += 6;

  for (const section of prd.sections) {
    checkPageBreak(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(139, 92, 246);
    const headingLines = doc.splitTextToSize(section.heading, contentWidth);
    for (const line of headingLines) {
      doc.text(line, margin, y);
      y += 7;
    }
    y += 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(63, 63, 70);

    const plainText = section.content
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^[-*]\s+/gm, "  - ")
      .replace(/^\d+\.\s+/gm, (m) => `  ${m}`)
      .replace(/#{1,6}\s+/g, "");

    const lines = doc.splitTextToSize(plainText, contentWidth);
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 5.5;
    }
    y += 6;
  }

  doc.save(`${prd.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

export async function downloadDocx(prd: PrdData): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
    TableRow,
    TableCell,
    Table,
    WidthType,
    ShadingType,
  } = await import("docx");

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: prd.title,
          bold: true,
          size: 36,
          font: "Arial",
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  for (const section of prd.sections) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            size: 28,
            font: "Arial",
            color: "6d28d9",
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    const lines = section.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ spacing: { after: 80 } }));
        continue;
      }

      if (trimmed.startsWith("# ")) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: parseInline(trimmed.slice(2)), bold: true, size: 24, font: "Arial" })],
            heading: HeadingLevel.HEADING_3,
          })
        );
      } else if (trimmed.startsWith("## ")) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: parseInline(trimmed.slice(3)), bold: true, size: 22, font: "Arial" })],
            heading: HeadingLevel.HEADING_3,
          })
        );
      } else if (/^[-*]\s+/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[-*]\s+/, "");
        children.push(
          new Paragraph({
            children: [new TextRun({ text: parseInline(bulletText), size: 22, font: "Arial" })],
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      } else if (/^\d+\.\s+/.test(trimmed)) {
        const numText = trimmed.replace(/^\d+\.\s+/, "");
        children.push(
          new Paragraph({
            children: [new TextRun({ text: parseInline(numText), size: 22, font: "Arial" })],
            numbering: { reference: "default-numbering", level: 0 },
            spacing: { after: 60 },
          })
        );
      } else if (trimmed.startsWith("|")) {
        const cells = trimmed
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (cells.some((c) => /^[-:]+$/.test(c))) continue;
        children.push(
          new Table({
            rows: [
              new TableRow({
                children: cells.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: parseInline(cell), size: 20, font: "Arial", bold: true })],
                        }),
                      ],
                      shading: { type: ShadingType.SOLID, color: "f3f4f6" },
                      width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
                    })
                ),
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: parseInline(trimmed), size: 22, font: "Arial" })],
            spacing: { after: 80 },
          })
        );
      }
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prd.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
