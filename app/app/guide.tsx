import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getSelected, setImageUri, setPhotoSize } from "../services/store";

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
const TEAL = "#20C5B2";

export default function GuideScreen() {
  const candidate = getSelected();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>("silhouette");
  const [zoomIdx, setZoomIdx] = useState(1);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        if (!mediaPermission?.granted) {
          await requestMediaPermission();
        }
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
    } catch (e) {
      console.error("사진 저장 실패:", e);
    } finally {
      setCapturing(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      setPhotoSize({ width: result.assets[0].width ?? 0, height: result.assets[0].height ?? 0 });
      router.push("/preview");
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
        facing={facing}
        zoom={ZOOMS[zoomIdx].expo}
      />

      {/* 뷰파인더 영역: 하단 컨트롤 위까지만 차지 → 오버레이가 UI 뒤로 안 들어감 */}
      <View style={s.viewfinder}>
        {/* 서버 합성 이미지 오버레이 (풍경 + 흰색 실루엣) */}
        {candidate && mode === "silhouette" && (
          <Image
            source={{ uri: candidate.preview_base64 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.75 }]}
            resizeMode="cover"
          />
        )}

        {/* 플래시 */}
        {flash && <View style={s.flash} />}

        {/* 상단 바 */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Text style={s.iconText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setFlash(!flash)}>
            <Image source={require("../assets/Frame1.png")} style={s.topIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 컨트롤: flex 레이아웃으로 뷰파인더 바로 아래에 위치 */}
      <View style={s.bottomSection}>
        {/* 줌 버튼 플로팅 처리 */}
        <View style={s.zoomRow}>
          {ZOOMS.map(({ label }, i) => (
            <TouchableOpacity
              key={label}
              style={[s.zoomBtn, zoomIdx === i && s.zoomBtnActive]}
              onPress={() => setZoomIdx(i)}
            >
              <Text style={s.zoomLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 모드 탭 */}
        <View style={s.modeRow}>
          {MODES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={s.modeTab}
              onPress={() => setMode(key)}
            >
              <Text style={[s.modeLabel, mode === key ? s.modeLabelActive : s.modeLabelInactive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 셔터 행 */}
        <View style={s.shutterRow}>
          <TouchableOpacity style={s.thumbBtn} onPress={pickImage} activeOpacity={0.7} />
          <TouchableOpacity
            style={[s.shutterOuter, capturing && s.shutterPressed]}
            onPress={capture}
            activeOpacity={0.8}
          >
            <View style={s.shutterInner} />
          </TouchableOpacity>
          {/* 카메라 전환 버튼 */}
          <TouchableOpacity
            style={s.flipBtn}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Image source={require("../assets/Frame5.png")} style={s.topIcon} />
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
    top: 0,
    left: 0,
    right: 0,
    height: 125,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  iconText: { color: "#000", fontSize: 18 },
  topIcon: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  // 하단 컨트롤: flex 레이아웃 (absolute 제거)
  bottomSection: {
    backgroundColor: "#fff",
    height: 230,
    paddingBottom: 80,
    paddingTop: 15,
    gap: 15,
  },

  zoomRow: {
    position: "absolute",
    top: -60,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    width: "100%",
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnActive: { backgroundColor: "#7C7C7C" },
  zoomLabel: { color: "#fff", fontSize: 13, fontWeight: "600" },

  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
  },
  modeTab: {
    paddingVertical: 8,
    alignItems: "center",
  },
  modeLabel: { fontSize: 17, fontWeight: "600" },
  modeLabelActive: { color: "#3ADFCC" },
  modeLabelInactive: { color: "#B0B0B0" },

  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginTop: 4,
  },
  thumbBtn: {
    width: 50,
    height: 50,
    borderRadius: 64,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  flipBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 77,
    height: 77,
    borderRadius: 77 / 2,
    borderWidth: 6,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterPressed: { opacity: 0.7 },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#fff" },
});
