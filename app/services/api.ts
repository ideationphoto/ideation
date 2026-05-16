const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

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
  try {
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
  } catch (error) {
    // 네트워크 연결 실패 시 여기서 에러를 다시 던져 index.tsx의 catch문이 작동하게 함
    console.log("[API] 요청 중 네트워크 오류 발생:", error);
    throw error;
  }
}
