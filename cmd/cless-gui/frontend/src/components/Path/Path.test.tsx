import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Path, formatMiddleEllipsis } from './Path';

describe('Path and formatMiddleEllipsis', () => {
  it('preserves short paths without truncation', () => {
    const short = 'C:/Users/User/file.pdf';
    expect(formatMiddleEllipsis(short, 50)).toBe(short);
  });

  it('middle-ellipsizes long directory paths keeping root and filename', () => {
    const long = 'C:/Users/Administrator/Documents/Projects/Accounting/2026/Final/report.pdf';
    const truncated = formatMiddleEllipsis(long, 30);
    expect(truncated).toContain('...');
    expect(truncated).toContain('report.pdf');
    expect(truncated.startsWith('C:/')).toBe(true);
    expect(truncated.length).toBeLessThanOrEqual(30);
  });

  it('truncates 60+ character filenames properly in the middle', () => {
    const longFilename =
      'very_long_project_asset_specification_documentation_bundle_archive_2026.zip';
    expect(longFilename.length).toBeGreaterThan(60);

    const truncated = formatMiddleEllipsis(longFilename, 25);
    expect(truncated).toContain('...');
    expect(truncated.startsWith('very_long')).toBe(true);
    expect(truncated.endsWith('.zip')).toBe(true);
  });

  it('handles 120+ character path strings gracefully', () => {
    const veryLongPath =
      'D:/Storage/Archive/Software_Engineering_Projects/ClutterLess_Organizer_Workspace/Build_Artifacts/Distribution/Setup_Production_Bundle_v3.exe';
    expect(veryLongPath.length).toBeGreaterThan(120);

    const truncated = formatMiddleEllipsis(veryLongPath, 40);
    expect(truncated).toContain('Setup_Production_Bundle_v3.exe');
    expect(truncated).toContain('...');
    expect(truncated.length).toBeLessThanOrEqual(40);
  });

  it('renders path component with text content and copy affordance', () => {
    render(<Path path="C:/Test/document.pdf" />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeDefined();
  });
});
