// src/components/hosts/host-icon.tsx
'use client';

import type { LucideProps } from 'lucide-react';
import { Laptop, Server, Smartphone, Printer, RouterIcon as NetworkRouterIcon, PcCase, HelpCircle, Apple as LucideAppleIcon, Laptop2 } from 'lucide-react';
import type React from 'react';
import { DiApple, DiAndroid, DiWindows, DiRaspberryPi, DiLinux } from 'devicons-react';

interface HostIconProps extends LucideProps { // Assuming Devicon components also accept similar props
  deviceType?: string;
}

const iconMap: Record<string, React.ElementType<any>> = { // Use 'any' for mixed component types
  windows_pc: DiWindows,
  linux_pc: DiLinux,
  macos_pc: DiApple,
  linux_server: DiLinux, // Using DiLinux as requested, could also be Server from lucide
  android_mobile: DiAndroid,
  ios_mobile: DiApple, // For "apple devices"
  printer: Printer,
  router_firewall: NetworkRouterIcon,
  raspberry_pi: DiRaspberryPi, // New type
  generic_device: PcCase,
  default: HelpCircle, // Fallback for unknown types
};

export function HostIcon({ deviceType, className, ...props }: HostIconProps) {
  const IconComponent = deviceType ? (iconMap[deviceType] || iconMap.default) : iconMap.default;
  return <IconComponent className={className} {...props} />;
}
