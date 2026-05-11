import type { AnalyzeResponse, Candidate } from "./api";

// 화면 간 분석 결과 공유용 단순 모듈 상태
let _imageUri: string | null = null;
let _photoSize: { width: number; height: number } | null = null;
let _analysis: AnalyzeResponse | null = null;
let _selected: Candidate | null = null;

export function setImageUri(uri: string) { _imageUri = uri; }
export function getImageUri() { return _imageUri; }

export function setPhotoSize(s: { width: number; height: number }) { _photoSize = s; }
export function getPhotoSize() { return _photoSize; }

export function setAnalysis(r: AnalyzeResponse) { _analysis = r; }
export function getAnalysis() { return _analysis; }

export function setSelected(c: Candidate) { _selected = c; }
export function getSelected() { return _selected; }
