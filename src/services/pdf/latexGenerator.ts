import type { TailoredResumeAST } from '../../types/resume.js';
import { LatexSyntaxValidator } from '../validation/latexSyntaxValidator.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';

export class LatexGenerator {
  private kb: CandidateKnowledgeBase;

  constructor(knowledgeBase?: CandidateKnowledgeBase) {
    this.kb = knowledgeBase || new CandidateKnowledgeBase();
  }

  public generateLatex(ast: TailoredResumeAST): string {
    const esc = (t: string) => LatexSyntaxValidator.escapeLatex(t);
    const profile = this.kb.getCandidateProfile();
    const contact = profile.personal_information;

    // Build experience items LaTeX
    let expSection = '';
    for (const exp of ast.experiences) {
      expSection += `
    \\resumeSubheading
      {${esc(exp.company)}}{${esc(exp.dates)}}
      {${esc(exp.role)}}{${esc(exp.location)}}
      \\resumeItemListStart`;

      for (const bullet of exp.bullets) {
        expSection += `
        \\resumeItem{${esc(bullet.generated_text)}}`;
      }

      expSection += `
      \\resumeItemListEnd
`;
    }

    // Build projects items LaTeX
    let prjSection = '';
    for (const prj of ast.projects) {
      prjSection += `
    \\resumeProjectHeading
      {\\textbf{${esc(prj.project_name)}} $|$ \\emph{${esc(prj.technologies_highlighted)}}}{${esc(prj.company)}}
      \\resumeItemListStart`;

      for (const bullet of prj.bullets) {
        prjSection += `
        \\resumeItem{${esc(bullet.generated_text)}}`;
      }

      prjSection += `
      \\resumeItemListEnd`;
    }

    const linksRow: string[] = [];
    if (contact.linkedin) {
      const cleanLinkedIn = contact.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      linksRow.push(`\\href{${contact.linkedin}}{\\underline{${esc(cleanLinkedIn)}}}`);
    }
    if (contact.portfolio || contact.website) {
      const pUrl = contact.portfolio || contact.website;
      const cleanPortfolio = pUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      linksRow.push(`\\href{${pUrl}}{\\underline{${esc(cleanPortfolio)}}}`);
    }
    const linksLatex = linksRow.length > 0 ? ` \\\\ \\vspace{1pt} \n    \\small ${linksRow.join(' $|$ ')}` : '';

    const latexDoc = `\\documentclass[letterpaper,10pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${esc(contact.full_name)}} \\\\ \\vspace{2pt}
    \\textbf{\\large ${esc(ast.headline)}} \\\\ \\vspace{3pt}
    \\small ${esc(contact.location)} $|$ ${esc(contact.phone)} $|$ ${esc(contact.email)}${linksLatex}
\\end{center}

%-----------SUMMARY-----------
\\section{Professional Summary}
\\small{
${esc(ast.summary)}
}

%-----------SKILLS-----------
\\section{Core Competencies \\& Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Product Strategy \\& Execution:} ${esc(ast.competencies.product_strategy)} \\\\
     \\textbf{FinTech \\& Payments:} ${esc(ast.competencies.fintech_payments)} \\\\
     \\textbf{Technical \\& Integrations:} ${esc(ast.competencies.technical_integrations)} \\\\
     \\textbf{Analytics \\& Tools:} ${esc(ast.competencies.analytics_tools)}
    }}
\\end{itemize}

%-----------EXPERIENCE-----------
\\section{Professional Experience}
  \\resumeSubHeadingListStart
${expSection}
  \\resumeSubHeadingListEnd

%-----------KEY PROJECTS-----------
\\section{Key Projects \\& Impact}
  \\resumeSubHeadingListStart
${prjSection}
  \\resumeSubHeadingListEnd

%-----------EDUCATION & CREDENTIALS-----------
\\section{Education, Certifications \\& Honors}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {University of Sargodha}{2014 -- 2018}
      {Bachelor of Science in Software Engineering}{Pakistan (GPA: 3.3/4.0)}
  \\resumeSubHeadingListEnd
  \\vspace{-4pt}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Certifications:} IBM AI Product Manager Specialization (2024) $|$ Google Data Analytics Certificate (2023) $|$ Generative AI: Prompt Engineering (IBM, 2024) \\\\
     \\textbf{Honors \\& Awards:} Outstanding Contribution Award -- elGrocer/Smiles (2024) $|$ Best KPI Achiever -- elGrocer (2023)
    }}
  \\end{itemize}

\\end{document}
`;

    const validation = LatexSyntaxValidator.validate(latexDoc);
    if (!validation.valid) {
      throw new Error(`Generated LaTeX failed syntax validation: ${validation.errors.join(', ')}`);
    }

    return latexDoc;
  }
}
