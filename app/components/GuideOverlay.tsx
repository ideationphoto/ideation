import React from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Ellipse, Line, Path } from "react-native-svg";
import type { Candidate } from "../services/api";
import { getPhotoSize } from "../services/store";

interface Props {
  candidate: Candidate;
}

const STROKE = "rgba(255,255,255,0.9)";
const SW = 2.5;

/**
 * 사진 좌표(0~1)를 화면 픽셀 좌표로 변환.
 * CameraView는 cover 모드로 사진을 화면에 채우므로
 * 비율 차이에 의한 크롭 오프셋을 보정해야 함.
 */
function photoToScreen(
  xNorm: number,
  yNorm: number,
  scaleRatio: number,
  screenW: number,
  screenH: number,
): { x: number; y: number; drawH: number } {
  const photoSize = getPhotoSize();

  if (!photoSize) {
    return { x: xNorm * screenW, y: yNorm * screenH, drawH: screenH };
  }

  const photoAspect = photoSize.width / photoSize.height;
  const screenAspect = screenW / screenH;

  let drawW: number, drawH: number, offsetX: number, offsetY: number;

  if (photoAspect > screenAspect) {
    // 사진이 화면보다 가로가 길다 → 높이에 맞추고 좌우 크롭
    drawH = screenH;
    drawW = screenH * photoAspect;
    offsetX = (drawW - screenW) / 2;
    offsetY = 0;
  } else {
    // 사진이 화면보다 세로가 길다 → 너비에 맞추고 상하 크롭
    drawW = screenW;
    drawH = screenW / photoAspect;
    offsetX = 0;
    offsetY = (drawH - screenH) / 2;
  }

  return {
    x: xNorm * drawW - offsetX,
    y: yNorm * drawH - offsetY,
    drawH,
  };
}

export default function GuideOverlay({ candidate }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const { position, scale } = candidate;

  const { x: footX, y: footY, drawH } = photoToScreen(
    position.x, position.y, scale, W, H
  );
  const silH = drawH * scale;

  const headRY = silH * 0.085;
  const headRX = silH * 0.068;
  const headCX = footX;
  const headCY = footY - silH + headRY;
  const neckTopY = headCY + headRY;

  const neckHW    = silH * 0.045;
  const shoulderHW = silH * 0.20;
  const shoulderY  = footY - silH * 0.78;

  const waistHW = silH * 0.13;
  const waistY  = footY - silH * 0.48;

  const hipHW = silH * 0.16;
  const hipY  = footY - silH * 0.40;

  const legHW    = silH * 0.09;
  const inseamHW = silH * 0.025;
  const inseamY  = footY - silH * 0.36;

  const d = [
    `M ${footX - neckHW},${shoulderY}`,
    `L ${footX - shoulderHW},${shoulderY}`,
    `L ${footX - waistHW},${waistY}`,
    `L ${footX - hipHW},${hipY}`,
    `L ${footX - legHW},${inseamY}`,
    `L ${footX - legHW},${footY}`,
    `L ${footX - inseamHW},${footY}`,
    `L ${footX - inseamHW},${inseamY}`,
    `L ${footX + inseamHW},${inseamY}`,
    `L ${footX + inseamHW},${footY}`,
    `L ${footX + legHW},${footY}`,
    `L ${footX + legHW},${inseamY}`,
    `L ${footX + hipHW},${hipY}`,
    `L ${footX + waistHW},${waistY}`,
    `L ${footX + shoulderHW},${shoulderY}`,
    `L ${footX + neckHW},${shoulderY}`,
    `L ${footX + neckHW},${neckTopY}`,
    `L ${footX - neckHW},${neckTopY}`,
    `Z`,
  ].join(" ");

  const armOut = silH * 0.03;

  return (
    <Svg style={{ position: "absolute", top: 0, left: 0 }} width={W} height={H}>
      <Ellipse
        cx={headCX} cy={headCY}
        rx={headRX} ry={headRY}
        fill="none" stroke={STROKE} strokeWidth={SW}
      />
      <Path
        d={d}
        fill="none" stroke={STROKE} strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Line
        x1={footX - shoulderHW} y1={shoulderY}
        x2={footX - shoulderHW - armOut} y2={hipY}
        stroke={STROKE} strokeWidth={SW} strokeLinecap="round"
      />
      <Line
        x1={footX + shoulderHW} y1={shoulderY}
        x2={footX + shoulderHW + armOut} y2={hipY}
        stroke={STROKE} strokeWidth={SW} strokeLinecap="round"
      />
    </Svg>
  );
}
