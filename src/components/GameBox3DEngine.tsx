import React from 'react';
import { Box3DEngine } from './Box3DEngine';

export interface GameBox3DEngineProps {
  title: string;
  posterUrl?: string | null;
  box3dUrl?: string | null;
  cartridgeUrl?: string | null;
  cartridge3DUrl?: string | null;
  cartridgeFrontUrl?: string | null;
  boxFrontUrl?: string | null;
  boxBackUrl?: string | null;
  boxSpineUrl?: string | null;
  cartridgeBackUrl?: string | null;
  launchboxId?: number | string | null;
  launchboxUrl?: string | null;
  publisher?: string;
  developer?: string;
  year?: number | string;
  genre?: string;
  synopsis?: string;
  consoleType?: string;
  initialMode?: 'box' | 'cartridge' | 'duo';
  isCompact?: boolean;
  onExpand?: () => void;
  className?: string;
}

export const GameBox3DEngine: React.FC<GameBox3DEngineProps> = (props) => {
  return <Box3DEngine {...(props as any)} />;
};

export { Box3DEngine, GameBox3D } from './Box3DEngine';
export default GameBox3DEngine;
