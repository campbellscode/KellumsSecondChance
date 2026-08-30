import {
  ArrowUpRight,
  CalendarCheck,
  ChefHat,
  Clock,
  Compass,
  DoorOpen,
  FileText,
  Grid3x3,
  Hammer,
  HardHat,
  Home,
  KeyRound,
  Layers,
  MessageCircle,
  MessageSquareQuote,
  PaintRoller,
  Ruler,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  Trees,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon registry.
 *
 * Content records store an icon *key* rather than a component, so a service or
 * value proposition can be edited from the database without a code change.
 * Importing named icons (rather than the dynamic loader) keeps the bundle to
 * only the glyphs actually used.
 */
const REGISTRY: Record<string, LucideIcon> = {
  'arrow-up-right': ArrowUpRight,
  'calendar-check': CalendarCheck,
  'chef-hat': ChefHat,
  clock: Clock,
  compass: Compass,
  'door-open': DoorOpen,
  'file-text': FileText,
  'grid-3x3': Grid3x3,
  hammer: Hammer,
  'hard-hat': HardHat,
  home: Home,
  'key-round': KeyRound,
  layers: Layers,
  'message-circle': MessageCircle,
  'message-square-quote': MessageSquareQuote,
  'paint-roller': PaintRoller,
  ruler: Ruler,
  'shield-check': ShieldCheck,
  'shower-head': ShowerHead,
  sparkles: Sparkles,
  trees: Trees,
  wrench: Wrench,
};

interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 22, strokeWidth = 1.5, className }: IconProps) {
  const Glyph = REGISTRY[name] ?? Hammer;
  return <Glyph size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
