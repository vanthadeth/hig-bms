import type { SVGProps } from "react";

const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
type P = SVGProps<SVGSVGElement>;

export const IconUsers = (p: P) => (<svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.7.7 2.7 2.2 3 4.6" /></svg>);
export const IconShield = (p: P) => (<svg {...base} {...p}><path d="M12 3 4.5 6v5.5c0 4.4 3 7.6 7.5 9.5 4.5-1.9 7.5-5.1 7.5-9.5V6L12 3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>);
export const IconGrid = (p: P) => (<svg {...base} {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>);
export const IconHome = (p: P) => (<svg {...base} {...p}><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8Z" /></svg>);
export const IconPlus = (p: P) => (<svg {...base} width={20} height={20} strokeWidth={2.2} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const IconSearch = (p: P) => (<svg {...base} width={18} height={18} strokeWidth={2} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>);
export const IconChevron = (p: P) => (<svg {...base} width={18} height={18} strokeWidth={2} {...p}><path d="m9 6 6 6-6 6" /></svg>);
export const IconBack = (p: P) => (<svg {...base} width={18} height={18} strokeWidth={2} {...p}><path d="m15 6-6 6 6 6" /></svg>);
export const IconLock = (p: P) => (<svg {...base} width={14} height={14} strokeWidth={2} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
export const IconCheck = (p: P) => (<svg {...base} width={16} height={16} strokeWidth={2.6} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const IconX = (p: P) => (<svg {...base} width={14} height={14} strokeWidth={2.6} {...p}><path d="m6 6 12 12M18 6 6 18" /></svg>);
export const IconDot = (p: P) => (<svg width={6} height={6} viewBox="0 0 6 6" aria-hidden {...p}><circle cx="3" cy="3" r="2.4" fill="currentColor" /></svg>);
export const IconLogout = (p: P) => (<svg {...base} width={18} height={18} {...p}><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="m15 8 4 4-4 4M19 12H9" /></svg>);
export const IconDownload = (p: P) => (<svg {...base} width={18} height={18} {...p}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>);
