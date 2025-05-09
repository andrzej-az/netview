// src/components/hosts/host-icon.tsx
'use client';

import type { LucideProps } from 'lucide-react';
import { Laptop, Server, Smartphone, Printer, RouterIcon as NetworkRouterIcon, PcCase, HelpCircle, Apple, Laptop2 } from 'lucide-react';
import type React from 'react';

interface HostIconProps extends LucideProps {
  deviceType?: string;
}

const iconMap: Record<string, React.ElementType<LucideProps>> = {
  windows_pc: Laptop,
  linux_pc: Laptop2, // Changed from Laptop to Laptop2 for differentiation
  macos_pc: Apple,
  linux_server: Server,
  android_mobile: Smartphone,
  ios_mobile: Smartphone,
  printer: Printer,
  router_firewall: NetworkRouterIcon,
  generic_device: PcCase,
  default: HelpCircle, // Fallback for unknown types
};

export function HostIcon({ deviceType, className, ...props }: HostIconProps) {
  const IconComponent = deviceType ? (iconMap[deviceType] || iconMap.default) : iconMap.default;
  return <IconComponent className={className} {...props} />;
}
