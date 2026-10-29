// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { cn } from '@/lib/utils';

export interface ClutterLessLogoProps extends React.SVGProps<SVGSVGElement> {
  /**
   * 'badge' renders the full squircle app icon; 'mark' renders only the inner Folder-C + sorted layers mark.
   */
  variant?: 'badge' | 'mark';
}

export const ClutterLessLogo: React.FC<ClutterLessLogoProps> = ({
  variant = 'badge',
  className,
  ...props
}) => {
  if (variant === 'mark') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="32 32 192 192"
        fill="none"
        aria-hidden="true"
        className={cn('size-5 shrink-0', className)}
        {...props}
      >
        <path
          d="M154 64H118L102 48H74C59.6406 48 48 59.6406 48 74V182C48 196.359 59.6406 208 74 208H154"
          stroke="currentColor"
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="108" y="94" width="98" height="20" rx="10" className="fill-brand" />
        <rect x="94" y="126" width="94" height="20" rx="10" fill="currentColor" fillOpacity="0.85" />
        <rect x="94" y="158" width="72" height="20" rx="10" fill="currentColor" fillOpacity="0.45" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
      {...props}
    >
      <rect x="12" y="12" width="232" height="232" rx="54" fill="#09090B" />
      <rect x="14" y="14" width="228" height="228" rx="52" stroke="#27272A" strokeWidth="6" />
      <path
        d="M154 64H118L102 48H74C59.6406 48 48 59.6406 48 74V182C48 196.359 59.6406 208 74 208H154"
        stroke="#FAFAFA"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="108" y="94" width="98" height="20" rx="10" fill="#22D3EE" />
      <rect x="94" y="126" width="94" height="20" rx="10" fill="#E4E4E7" />
      <rect x="94" y="158" width="72" height="20" rx="10" fill="#71717A" />
    </svg>
  );
};

