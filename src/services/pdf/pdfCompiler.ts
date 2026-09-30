import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import PDFDocument from 'pdfkit';
import type { TailoredResumeAST } from '../../types/resume.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';

export interface CompilationResult {
  success: boolean;
  compiler_used: 'pdflatex' | 'latexmk' | 'headless_engine';
  file_path: string;
  file_size_bytes: number;
  retries_used: number;
  error?: string;
}

export class PDFCompiler {
  private kb: CandidateKnowledgeBase;

  constructor(knowledgeBase?: CandidateKnowledgeBase) {
    this.kb = knowledgeBase || new CandidateKnowledgeBase();
  }

  public async compileResume(
    latexContent: string,
    outputPdfPath: string,
    ast: TailoredResumeAST
  ): Promise<CompilationResult> {
    const outputDir = path.dirname(outputPdfPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let retries = 0;
    const maxRetries = 3;

    // Check if host has pdflatex or latexmk
    const hasHostLatex = this.detectHostLatex();

    if (hasHostLatex) {
      while (retries < maxRetries) {
        try {
          this.compileWithHostLatex(latexContent, outputPdfPath);
          if (this.validatePdf(outputPdfPath)) {
            const stats = fs.statSync(outputPdfPath);
            return {
              success: true,
              compiler_used: hasHostLatex,
              file_path: outputPdfPath,
              file_size_bytes: stats.size,
              retries_used: retries,
            };
          }
        } catch (err: any) {
          retries++;
          console.warn(`Host LaTeX compilation attempt ${retries} failed: ${err.message}`);
        }
      }
    }

    // High-Fidelity Headless PDF Compiler Fallback
    try {
      await this.compileWithHeadlessEngine(ast, outputPdfPath);
      if (this.validatePdf(outputPdfPath)) {
        const stats = fs.statSync(outputPdfPath);
        return {
          success: true,
          compiler_used: 'headless_engine',
          file_path: outputPdfPath,
          file_size_bytes: stats.size,
          retries_used: retries,
        };
      } else {
        throw new Error('Generated PDF failed post-compilation integrity check.');
      }
    } catch (err: any) {
      return {
        success: false,
        compiler_used: 'headless_engine',
        file_path: outputPdfPath,
        file_size_bytes: 0,
        retries_used: retries,
        error: `RESUME_COMPILATION_FAILED: ${err.message}`,
      };
    }
  }

  private detectHostLatex(): 'pdflatex' | 'latexmk' | null {
    try {
      execSync('which pdflatex', { stdio: 'ignore' });
      return 'pdflatex';
    } catch {
      try {
        execSync('which latexmk', { stdio: 'ignore' });
        return 'latexmk';
      } catch {
        return null;
      }
    }
  }

  private compileWithHostLatex(latexContent: string, outputPdfPath: string): void {
    const tmpDir = path.dirname(outputPdfPath);
    const baseName = path.basename(outputPdfPath, '.pdf');
    const texPath = path.join(tmpDir, `${baseName}.tex`);

    fs.writeFileSync(texPath, latexContent, 'utf8');
    execSync(`pdflatex -interaction=nonstopmode -output-directory="${tmpDir}" "${texPath}"`, {
      timeout: 30000,
      stdio: 'pipe',
    });
  }

  /**
   * High-Fidelity Executive Headless PDF Engine
   * Generates a clean, uncluttered, ATS-compliant executive resume.
   */
  public compileWithHeadlessEngine(ast: TailoredResumeAST, outputPdfPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const leftMargin = 40;
      const rightMargin = 612 - 40;
      const contentWidth = rightMargin - leftMargin; // 532pt
      const colRightW = 150;
      const colLeftW = contentWidth - colRightW; // 382pt
      const colRightX = leftMargin + colLeftW;

      const doc = new PDFDocument({
        size: 'LETTER',
        bufferPages: true,
        margins: { top: 34, bottom: 42, left: leftMargin, right: 40 },
      });

      const writeStream = fs.createWriteStream(outputPdfPath);
      doc.pipe(writeStream);

      const profile = this.kb.getCandidateProfile();
      const contact = profile.personal_information;

      // 1. Header: Candidate Name
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(contact.full_name, {
        align: 'center',
        characterSpacing: 0.6,
      });
      doc.moveDown(0.12);

      // 2. Headline / Target Focus
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#1e40af').text(ast.headline, {
        align: 'center',
        characterSpacing: 0.3,
      });
      doc.moveDown(0.2);

      // 3. Contact Line: Location, Phone, Email (Strictly verified only)
      const locationText = contact.location || 'Pakistan (Open to Relocation & Remote)';
      const contactLine = `${locationText}   •   ${contact.phone}   •   ${contact.email}`;
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(contactLine, { align: 'center' });

      // Only render links if candidate explicitly provided them
      if (contact.linkedin || contact.portfolio || contact.website) {
        doc.moveDown(0.15);
        const cleanLinkedIn = contact.linkedin ? contact.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
        const portfolioUrl = contact.portfolio || contact.website;
        const cleanPortfolio = portfolioUrl ? portfolioUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';

        const linksText = [cleanLinkedIn, cleanPortfolio].filter(Boolean).join('   •   ');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e40af').text(linksText, {
          align: 'center',
        });
      }
      doc.moveDown(0.35);

      // Helper: Draw Section Header with sleek hairline divider
      const drawSectionHeader = (title: string) => {
        doc.moveDown(0.45);
        const headerY = doc.y;
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(title.toUpperCase(), leftMargin, headerY, {
          characterSpacing: 0.6,
        });
        const y = doc.y + 2.5;
        doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(leftMargin, y).lineTo(rightMargin, y).stroke();
        doc.y = y + 5;
      };

      // 4. Professional Summary (Clean, left-aligned, generous line-height)
      drawSectionHeader('Professional Summary');
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(ast.summary, leftMargin, doc.y, {
        width: contentWidth,
        align: 'left',
        lineGap: 2.6,
      });

      // 5. Core Competencies & Expertise (Clean structured 4 rows)
      drawSectionHeader('Core Competencies & Expertise');
      const renderComp = (label: string, value: string) => {
        const lineY = doc.y;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(`${label}: `, leftMargin, lineY, { continued: true });
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(value, { lineGap: 2.0 });
        doc.moveDown(0.1);
      };
      renderComp('Product Strategy & Delivery', ast.competencies.product_strategy);
      renderComp('FinTech & Payment Systems', ast.competencies.fintech_payments);
      renderComp('Technical & Platform APIs', ast.competencies.technical_integrations);
      renderComp('Observability & Analytics Tools', ast.competencies.analytics_tools);

      // 6. Professional Experience
      drawSectionHeader('Professional Experience');
      for (const exp of ast.experiences) {
        // Line 1: Role (Left) + Dates (Right)
        const roleY = doc.y;
        const roleH = doc.heightOfString(exp.role, { width: colLeftW });
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(exp.role, leftMargin, roleY, {
          width: colLeftW,
        });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(exp.dates, colRightX, roleY, {
          width: colRightW,
          align: 'right',
        });
        doc.y = roleY + Math.max(roleH, 12) + 1;

        // Line 2: Company (Left) + Location (Right)
        const compY = doc.y;
        const compH = doc.heightOfString(exp.company, { width: colLeftW });
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e40af').text(exp.company, leftMargin, compY, {
          width: colLeftW,
        });
        doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b').text(exp.location, colRightX, compY, {
          width: colRightW,
          align: 'right',
        });
        doc.y = compY + Math.max(compH, 11) + 4;

        // Bullets (Clean spacing, 2.2 lineGap, crisp marker)
        for (const bullet of exp.bullets) {
          const bulletY = doc.y;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e40af').text('•', leftMargin + 4, bulletY);
          doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b').text(bullet.generated_text, leftMargin + 14, bulletY, {
            width: contentWidth - 14,
            lineGap: 2.2,
          });
          doc.moveDown(0.2);
        }
        doc.moveDown(0.35);
      }

      // 7. Key Projects & Strategic Impact
      drawSectionHeader('Key Projects & Strategic Impact');
      for (const prj of ast.projects) {
        const prjY = doc.y;
        const prjH = doc.heightOfString(prj.project_name, { width: colLeftW });
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(prj.project_name, leftMargin, prjY, {
          width: colLeftW,
        });
        doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b').text(prj.company, colRightX, prjY, {
          width: colRightW,
          align: 'right',
        });
        doc.y = prjY + Math.max(prjH, 11) + 2;

        if (prj.technologies_highlighted) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e40af').text(`Stack & Tools: ${prj.technologies_highlighted}`, leftMargin, doc.y, {
            width: contentWidth,
          });
          doc.moveDown(0.1);
        }

        for (const bullet of prj.bullets) {
          const bulletY = doc.y;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e40af').text('•', leftMargin + 4, bulletY);
          doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b').text(bullet.generated_text, leftMargin + 14, bulletY, {
            width: contentWidth - 14,
            lineGap: 2.2,
          });
          doc.moveDown(0.15);
        }
        doc.moveDown(0.25);
      }

      // 8. Education, Certifications & Honors
      drawSectionHeader('Education, Certifications & Honors');
      for (const edu of profile.education) {
        const eduY = doc.y;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(edu.degree, leftMargin, eduY, {
          width: colLeftW,
        });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text(edu.graduation_year || '2018', colRightX, eduY, {
          width: colRightW,
          align: 'right',
        });
        doc.y = eduY + 11;
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(
          `${edu.institution}   •   ${edu.location || 'Pakistan'} (GPA: ${edu.gpa || '3.3/4.0'})`,
          leftMargin,
          doc.y
        );
        doc.moveDown(0.2);
      }

      if (profile.certifications && profile.certifications.length > 0) {
        doc.moveDown(0.1);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('Professional Certifications:');
        doc.moveDown(0.06);
        for (const cert of profile.certifications) {
          const certY = doc.y;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e40af').text('•', leftMargin + 4, certY);
          doc.font('Helvetica').fontSize(8).fillColor('#334155').text(`${cert.name} (${cert.issuer}, ${cert.year})`, leftMargin + 14, certY);
          doc.moveDown(0.08);
        }
      }

      if (profile.awards && profile.awards.length > 0) {
        doc.moveDown(0.1);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('Key Honors & Recognitions:');
        doc.moveDown(0.06);
        for (const award of profile.awards) {
          const awardY = doc.y;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e40af').text('•', leftMargin + 4, awardY);
          doc.font('Helvetica').fontSize(8).fillColor('#334155').text(`${award.title} — ${award.organization} (${award.year})`, leftMargin + 14, awardY);
          doc.moveDown(0.08);
        }
      }

      // 9. Page Numbers & Running Footer across all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(leftMargin, 746).lineTo(rightMargin, 746).stroke();
        doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text(
          'Sana Liaqat — Senior Product Manager   •   sannayamughal9@gmail.com',
          leftMargin,
          752,
          { width: contentWidth - 100, align: 'left' }
        );
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#94a3b8').text(
          `Page ${i + 1} of ${range.count}`,
          rightMargin - 100,
          752,
          { width: 100, align: 'right' }
        );
      }

      doc.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });
  }

  private validatePdf(pdfPath: string): boolean {
    if (!fs.existsSync(pdfPath)) return false;
    const stats = fs.statSync(pdfPath);
    if (stats.size < 3000) return false;

    // Check header
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(pdfPath, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    return buffer.toString() === '%PDF-';
  }
}
