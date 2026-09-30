export class LatexSyntaxValidator {
  /**
   * Escape special LaTeX characters unless already escaped.
   */
  public static escapeLatex(text: string): string {
    if (!text) return '';

    // First replace backslashes (if any stray)
    let s = text;

    // Replace unescaped &
    s = s.replace(/(?<!\\)&/g, '\\&');
    // Replace unescaped %
    s = s.replace(/(?<!\\)%/g, '\\%');
    // Replace unescaped $
    s = s.replace(/(?<!\\)\$/g, '\\$');
    // Replace unescaped #
    s = s.replace(/(?<!\\)#/g, '\\#');
    // Replace unescaped _
    s = s.replace(/(?<!\\)_/g, '\\_');

    return s;
  }

  /**
   * Verify brace balance and common syntax errors.
   */
  public static validate(latexContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let braceCount = 0;

    for (let i = 0; i < latexContent.length; i++) {
      const char = latexContent[i];
      const prevChar = i > 0 ? latexContent[i - 1] : '';

      if (char === '{' && prevChar !== '\\') {
        braceCount++;
      } else if (char === '}' && prevChar !== '\\') {
        braceCount--;
        if (braceCount < 0) {
          errors.push(`Unmatched closing brace '}' at position ${i}`);
          break;
        }
      }
    }

    if (braceCount > 0) {
      errors.push(`Unclosed opening braces: ${braceCount} unclosed '{'`);
    }

    if (!latexContent.includes('\\begin{document}') || !latexContent.includes('\\end{document}')) {
      errors.push('Missing \\begin{document} or \\end{document}');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
