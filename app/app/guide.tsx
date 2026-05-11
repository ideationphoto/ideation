import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getSelected } from "../services/store";

type Mode = "ar" | "normal" | "silhouette";
const MODES: { key: Mode; label: string }[] = [
  { key: "ar", label: "AR 가이드" },
  { key: "normal", label: "일반" },
  { key: "silhouette", label: "실루엣 모드" },
];
const ZOOMS = [
  { label: "0.5x", expo: 0 },
  { label: "1x", expo: 0.15 },
  { label: "2x", expo: 0.45 },
];
const TEAL = "#4ECDC4";

export default function GuideScreen() {
  const candidate = getSelected();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>("silhouette");
  const [zoomIdx, setZoomIdx] = useState(1);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    try {
      await cameraRef.current.takePictureAsync({ quality: 0.9 });
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) return <View style={s.bg} />;

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.text}>카메라 권한이 필요합니다</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>권한 허용</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.bg}>
      {/* 카메라: 전체 화면 */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        zoom={ZOOMS[zoomIdx].expo}
      />

      {/* 뷰파인더 영역: 하단 컨트롤 위까지만 차지 → 오버레이가 UI 뒤로 안 들어감 */}
      <View style={s.viewfinder}>
        {/* 서버 합성 이미지 오버레이 (풍경 + 흰색 실루엣) */}
        {candidate && mode === "silhouette" && (
          <Image
            source={{ uri: candidate.preview_base64 }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            // @ts-ignore
            opacity={0.65}
          />
        )}

        {/* 플래시 */}
        {flash && <View style={s.flash} />}

        {/* 상단 바 */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Text style={s.iconText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Text style={s.iconText}>⚡</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 컨트롤: flex 레이아웃으로 뷰파인더 바로 아래에 위치 */}
      <View style={s.bottomSection}>
        {/* 줌 버튼 */}
        <View style={s.zoomRow}>
          {ZOOMS.map(({ label }, i) => (
            <TouchableOpacity
              key={label}
              style={[s.zoomBtn, zoomIdx === i && s.zoomBtnActive]}
              onPress={() => setZoomIdx(i)}
            >
              <Text style={[s.zoomLabel, zoomIdx === i && s.zoomLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 모드 탭 */}
        <View style={s.modeRow}>
          {MODES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.modeTab, mode === key && s.modeTabActive]}
              onPress={() => setMode(key)}
            >
              <Text style={[s.modeLabel, mode === key && s.modeLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 셔터 행 */}
        <View style={s.shutterRow}>
          <TouchableOpacity style={s.thumbBtn} />
          <TouchableOpacity
            style={[s.shutterOuter, capturing && s.shutterPressed]}
            onPress={capture}
            activeOpacity={0.8}
          >
            <View style={s.shutterInner} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Text style={s.iconText}>⟳</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#000", flexDirection: "column" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  text: { color: "#fff", fontSize: 16, marginBottom: 16 },
  permBtn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  permBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  // 뷰파인더: 하단 컨트롤 위까지만 차지
  viewfinder: { flex: 1, overflow: "hidden" },

  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: "#fff", opacity: 0.5 },

  topBar: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { color: "#fff", fontSize: 18 },

  // 하단 컨트롤: flex 레이아웃 (absolute 제거)
  bottomSection: {
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingBottom: 40,
    paddingTop: 12,
    gap: 12,
  },

  zoomRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  zoomBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  zoomBtnActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  zoomLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
  zoomLabelActive: { color: "#fff" },

  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  modeTabActive: { backgroundColor: TEAL },
  modeLabel: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: "500" },
  modeLabelActive: { color: "#fff", fontWeight: "700" },

  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginTop: 4,
  },
  thumbBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterPressed: { borderColor: "#aaa" },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff" },
});
