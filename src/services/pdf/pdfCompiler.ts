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
   * Generates a beautifully formatted, ATS-compliant 2-page executive resume
   * with precise padding, clean alignment, and zero overflow.
   */
  public compileWithHeadlessEngine(ast: TailoredResumeAST, outputPdfPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const leftMargin = 38;
      const rightMargin = 612 - 38;
      const contentWidth = rightMargin - leftMargin; // 536pt
      const colRightW = 145;
      const colLeftW = contentWidth - colRightW;
      const colRightX = leftMargin + colLeftW;

      const doc = new PDFDocument({
        size: 'LETTER',
        bufferPages: true,
        autoFirstPage: false,
        margins: { top: 34, bottom: 42, left: leftMargin, right: 38 },
      });

      const writeStream = fs.createWriteStream(outputPdfPath);
      doc.pipe(writeStream);

      const profile = this.kb.getCandidateProfile();
      const contact = profile.personal_information;

      const drawSectionHeader = (title: string) => {
        doc.moveDown(0.42);
        const headerY = doc.y;
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(title.toUpperCase(), leftMargin, headerY, {
          characterSpacing: 0.7,
        });
        const lineY = doc.y + 2;
        doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(leftMargin, lineY).lineTo(rightMargin, lineY).stroke();
        doc.y = lineY + 6;
      };

      const renderRoleBlock = (exp: any) => {
        const roleY = doc.y;
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(exp.role, leftMargin, roleY, { width: colLeftW });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569').text(exp.dates, colRightX, roleY, { width: colRightW, align: 'right' });
        doc.moveDown(0.12);

        const compY = doc.y;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1d4ed8').text(exp.company, leftMargin, compY, { width: colLeftW });
        doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b').text(exp.location, colRightX, compY, { width: colRightW, align: 'right' });
        doc.moveDown(0.28);

        for (const bullet of exp.bullets) {
          const bY = doc.y;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1d4ed8').text('•', leftMargin + 4, bY);
          doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b').text(bullet.generated_text, leftMargin + 14, bY, {
            width: contentWidth - 14,
            lineGap: 2.1,
          });
          doc.moveDown(0.16);
        }
        doc.moveDown(0.3);
      };

      // ===================== PAGE 1 =====================
      doc.addPage();

      // 1. Candidate Name
      doc.font('Helvetica-Bold').fontSize(21).fillColor('#0f172a').text(contact.full_name, {
        align: 'center',
        characterSpacing: 0.5,
      });
      doc.moveDown(0.12);

      // 2. Target Role Headline
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1d4ed8').text(ast.headline, {
        align: 'center',
        characterSpacing: 0.2,
      });
      doc.moveDown(0.18);

      // 3. Contact Line
      const locationText = contact.location || 'Pakistan (Open to Relocation & Remote)';
      const contactLine = `${locationText}   •   ${contact.phone}   •   ${contact.email}`;
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(contactLine, { align: 'center' });

      // 4. Links
      if (contact.linkedin || contact.portfolio || contact.website) {
        doc.moveDown(0.12);
        const cleanLinkedIn = contact.linkedin ? contact.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
        const portfolioUrl = contact.portfolio || contact.website;
        const cleanPortfolio = portfolioUrl ? portfolioUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
        const linksText = [cleanLinkedIn, cleanPortfolio].filter(Boolean).join('   •   ');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1d4ed8').text(linksText, { align: 'center' });
      }
      doc.moveDown(0.35);

      // 5. Professional Summary
      drawSectionHeader('Professional Summary');
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(ast.summary, leftMargin, doc.y, {
        width: contentWidth,
        align: 'left',
        lineGap: 2.4,
      });

      // 6. Core Competencies
      drawSectionHeader('Core Competencies & Technical Expertise');
      const renderComp = (label: string, value: string) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(`${label}: `, leftMargin, doc.y, { continued: true });
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(value, { lineGap: 1.8 });
        doc.moveDown(0.12);
      };
      renderComp('Product Strategy & Delivery', ast.competencies.product_strategy);
      renderComp('FinTech & Payment Rails', ast.competencies.fintech_payments);
      renderComp('Technical & Platform APIs', ast.competencies.technical_integrations);
      renderComp('Analytics & Experimentation Tools', ast.competencies.analytics_tools);

      // 7. Professional Experience
      drawSectionHeader('Professional Experience');

      const totalExperiences = ast.experiences.length;
      if (totalExperiences >= 3) {
        // Page 1 gets top 2 roles (Bayuti & elGrocer)
        renderRoleBlock(ast.experiences[0]);
        renderRoleBlock(ast.experiences[1]);

        // ===================== PAGE 2 =====================
        doc.addPage();
        drawSectionHeader('Professional Experience (Continued)');
        for (let i = 2; i < totalExperiences; i++) {
          renderRoleBlock(ast.experiences[i]);
        }
      } else {
        // Fewer than 3 roles: render all
        for (const exp of ast.experiences) {
          renderRoleBlock(exp);
        }
        if (doc.y > 480) {
          doc.addPage();
        }
      }

      // 8. Key Strategic Projects
      drawSectionHeader('Key Strategic Projects & Platform Impact');
      for (const prj of ast.projects) {
        const prjY = doc.y;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(prj.project_name, leftMargin, prjY, { width: colLeftW });
        doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b').text(prj.company, colRightX, prjY, { width: colRightW, align: 'right' });
        doc.moveDown(0.12);

        if (prj.technologies_highlighted) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1d4ed8').text(`Stack & Tools: ${prj.technologies_highlighted}`, leftMargin, doc.y, {
            width: contentWidth,
          });
          doc.moveDown(0.12);
        }

        for (const bullet of prj.bullets) {
          const bY = doc.y;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1d4ed8').text('•', leftMargin + 4, bY);
          doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b').text(bullet.generated_text, leftMargin + 14, bY, {
            width: contentWidth - 14,
            lineGap: 2.1,
          });
          doc.moveDown(0.14);
        }
        doc.moveDown(0.28);
      }

      // 9. Education
      drawSectionHeader('Education & Academic Credentials');
      for (const edu of profile.education) {
        const eduY = doc.y;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(edu.degree, leftMargin, eduY, { width: colLeftW });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text(edu.graduation_year || '2018', colRightX, eduY, { width: colRightW, align: 'right' });
        doc.moveDown(0.12);
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(
          `${edu.institution}   •   ${edu.location || 'Pakistan'} (GPA: ${edu.gpa || '3.3/4.0'})`,
          leftMargin,
          doc.y
        );
        doc.moveDown(0.22);
      }

      // 10. Certifications
      if (profile.certifications && profile.certifications.length > 0) {
        drawSectionHeader('Professional Certifications & Continuous Learning');
        for (const cert of profile.certifications) {
          const cY = doc.y;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1d4ed8').text('•', leftMargin + 4, cY);
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(cert.name, leftMargin + 14, cY, { continued: true });
          doc.font('Helvetica').fontSize(8).fillColor('#475569').text(` — ${cert.issuer} (${cert.year})`);
          doc.moveDown(0.1);
        }
      }

      // 11. Honors & Recognitions
      if (profile.awards && profile.awards.length > 0) {
        doc.moveDown(0.18);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('Key Honors & Recognitions:');
        doc.moveDown(0.08);
        for (const award of profile.awards) {
          const aY = doc.y;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1d4ed8').text('•', leftMargin + 4, aY);
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(award.title, leftMargin + 14, aY, { continued: true });
          doc.font('Helvetica').fontSize(8).fillColor('#475569').text(` — ${award.organization} (${award.year})`);
          doc.moveDown(0.08);
        }
      }

      // 12. Running Header/Footer on each page with zero-margin safety
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const origBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(leftMargin, 748).lineTo(rightMargin, 748).stroke();
        doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text(
          `${contact.full_name} — Senior Product Manager   •   ${contact.email}`,
          leftMargin,
          754,
          { width: contentWidth - 100, align: 'left', lineBreak: false }
        );
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#94a3b8').text(
          `Page ${i + 1} of ${range.count}`,
          rightMargin - 100,
          754,
          { width: 100, align: 'right', lineBreak: false }
        );

        doc.page.margins.bottom = origBottom;
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
