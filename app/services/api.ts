// iOS 시뮬레이터: localhost:8000
// Android 에뮬레이터: 10.0.2.2:8000
// 실기기: PC의 로컬 IP (같은 와이파이 필수)
const BACKEND_URL = "http://192.168.0.5:8000";

export interface Position {
  x: number;
  y: number;
}

export interface Candidate {
  rank: number;
  nima_score: number;
  position: Position;
  scale: number;           // 실루엣 높이 / 이미지 높이 (0~1)
  preview_base64: string;  // data:image/jpeg;base64,...
}

export interface AnalyzeResponse {
  request_id: string;
  candidates: Candidate[];
}

export async function analyzeLandscape(imageUri: string): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "landscape.jpg",
  } as any);

  const response = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `서버 오류 (${response.status})`);
  }

  return response.json();
}
