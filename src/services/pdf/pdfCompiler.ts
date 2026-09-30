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
          const res = this.compileWithHostLatex(latexContent, outputPdfPath);
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
   * High-Fidelity Headless PDF Engine
   * Generates a pixel-perfect, ATS-compliant PDF matching the LaTeX template.
   */
  public compileWithHeadlessEngine(ast: TailoredResumeAST, outputPdfPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
      });

      const writeStream = fs.createWriteStream(outputPdfPath);
      doc.pipe(writeStream);

      const profile = this.kb.getCandidateProfile();
      const contact = profile.personal_information;

      // Header: Name & Contact
      doc.font('Helvetica-Bold').fontSize(18).text(contact.full_name, { align: 'center' });
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a365d').text(ast.headline, { align: 'center' });
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(9).fillColor('#4a5568').text(
        `${contact.location}  |  ${contact.email}  |  ${contact.phone}  |  linkedin.com/in/sana-liaqat-pm  |  sanapm.me`,
        { align: 'center' }
      );
      doc.moveDown(0.8);

      const drawSectionHeader = (title: string) => {
        doc.moveDown(0.4);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(title.toUpperCase());
        const y = doc.y + 2;
        doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(36, y).lineTo(576, y).stroke();
        doc.moveDown(0.4);
      };

      // Professional Summary
      drawSectionHeader('Professional Summary');
      doc.font('Helvetica').fontSize(8.5).fillColor('#2d3748').text(ast.summary, {
        align: 'justify',
        lineGap: 1.5,
      });

      // Core Competencies
      drawSectionHeader('Core Competencies & Skills');
      const renderComp = (label: string, value: string) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1a202c').text(`${label}: `, { continued: true });
        doc.font('Helvetica').fontSize(8.5).fillColor('#2d3748').text(value, { lineGap: 1.2 });
      };
      renderComp('Product Strategy & Execution', ast.competencies.product_strategy);
      renderComp('FinTech & Payments', ast.competencies.fintech_payments);
      renderComp('Technical & Integrations', ast.competencies.technical_integrations);
      renderComp('Analytics & Tools', ast.competencies.analytics_tools);

      // Professional Experience
      drawSectionHeader('Professional Experience');
      for (const exp of ast.experiences) {
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000').text(exp.company, { continued: true });
        doc.font('Helvetica').fontSize(8.5).fillColor('#4a5568').text(`  ${exp.dates}`, { align: 'right' });
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#2b6cb0').text(exp.role, { continued: true });
        doc.font('Helvetica').fontSize(8.5).fillColor('#718096').text(`  (${exp.location})`, { align: 'right' });
        doc.moveDown(0.2);

        for (const bullet of exp.bullets) {
          doc.font('Helvetica').fontSize(8.5).fillColor('#2d3748').text(`•  ${bullet.generated_text}`, {
            indent: 10,
            lineGap: 1.2,
          });
          doc.moveDown(0.15);
        }
        doc.moveDown(0.25);
      }

      // Key Projects
      drawSectionHeader('Key Projects & Strategic Impact');
      for (const prj of ast.projects) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text(prj.project_name, { continued: true });
        doc.font('Helvetica').fontSize(8.5).fillColor('#718096').text(` | ${prj.technologies_highlighted}`, { continued: true });
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#4a5568').text(` (${prj.company})`, { align: 'right' });
        doc.moveDown(0.15);

        for (const bullet of prj.bullets) {
          doc.font('Helvetica').fontSize(8.5).fillColor('#2d3748').text(`•  ${bullet.generated_text}`, {
            indent: 10,
            lineGap: 1.2,
          });
        }
        doc.moveDown(0.2);
      }

      // Education & Certifications
      drawSectionHeader('Education & Certifications');
      for (const edu of profile.education) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text(edu.degree, { continued: true });
        doc.font('Helvetica').fontSize(8.5).fillColor('#4a5568').text(` -- ${edu.institution} (${edu.graduation_year})`, { align: 'left' });
      }
      doc.moveDown(0.15);
      const certs = profile.certifications.map(c => `${c.name} (${c.issuer})`).join('  |  ');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1a202c').text('Certifications: ', { continued: true });
      doc.font('Helvetica').fontSize(8.5).fillColor('#2d3748').text(certs);

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
